pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import { IGelatoProviders } from "./interfaces/IGelatoProviders.sol";
import { GelatoSysAdmin } from "./GelatoSysAdmin.sol";
import { Address } from "../external/Address.sol";
import { SafeMath } from "../external/SafeMath.sol";
import { IGelatoProviderModule } from "./interfaces/IGelatoProviderModule.sol";
import { EnumerableAddressSet } from "../external/EnumerableAddressSet.sol";
import { EnumerableWordSet } from "../external/EnumerableWordSet.sol";
import { ExecClaim } from "./interfaces/IGelatoCore.sol";

/// @title GelatoProviders
/// @notice APIs for GelatoCore Owner and execClaimTenancy
/// @dev Find all NatSpecs inside IGelatoCoreAccounting
abstract contract GelatoProviders is IGelatoProviders, GelatoSysAdmin {

    using Address for address payable;  /// for sendValue method
    using EnumerableAddressSet for EnumerableAddressSet.AddressSet;
    using EnumerableWordSet for EnumerableWordSet.WordSet;
    using SafeMath for uint256;

    mapping(address => uint256) public override providerFunds;
    mapping(address => address) public override providerExecutor;
    mapping(address => uint256) public override executorProvidersCount;
    mapping(address => EnumerableAddressSet.AddressSet) internal _providerModules;
    mapping(address => EnumerableWordSet.WordSet) internal execClaimHashesByProvider;

    // IGelatoProviderModule: Gelato Minting/Execution Gate
    function isProvided(
        ExecClaim memory _execClaim,
        address _executor,
        uint256 _gelatoGasPrice
    )
        public
        view
        override
        returns(string memory)
    {
        if (!isProviderModule(_execClaim.provider, _execClaim.providerModule))
            return "InvalidProviderModule";
        IGelatoProviderModule providerModule = IGelatoProviderModule(
            _execClaim.providerModule
        );
        if (_executor == address(0)) _executor = providerExecutor[_execClaim.provider];
        return providerModule.isProvided(_execClaim, _executor, _gelatoGasPrice);
    }

    // Registration
    function registerProvider(address _executor, address[] calldata _modules)
        external
        payable
        override
    {
        provideFunds(msg.sender);
        assignProviderExecutor(msg.sender, _executor);
        batchAddProviderModules(_modules);
        emit LogRegisterProvider(msg.sender);
    }

    function unregisterProvider(address[] calldata _modules)
        external
        override
    {
        uint256 remainingFunds = providerFunds[msg.sender];
        delete providerFunds[msg.sender];
        msg.sender.sendValue(remainingFunds);
        delete providerExecutor[msg.sender];
        batchRemoveProviderModules(_modules);
        emit LogUnregisterProvider(msg.sender);
    }

    // Provider Funding
    function provideFunds(address _provider) public payable override {
        require(msg.value > 0, "GelatoProviders.provideFunds: zero value");
        uint256 newProviderFunds = providerFunds[_provider].add(msg.value);
        emit LogProvideFunds(_provider, providerFunds[_provider], newProviderFunds);
        providerFunds[_provider] = newProviderFunds;
    }

    function unprovideFunds(uint256 _withdrawAmount) public override {
        require(_withdrawAmount > 0, "GelatoProviders.unprovideFunds: 0");
        // Checks
        uint256 previousProviderFunds = providerFunds[msg.sender];
        require(
            previousProviderFunds >= _withdrawAmount,
            "GelatoProviders.unprovideFunds: out of funds"
        );
        uint256 newProviderFunds = previousProviderFunds - _withdrawAmount;
        // Effects
        providerFunds[msg.sender] = newProviderFunds;
        // Interaction
        msg.sender.sendValue(_withdrawAmount);
        emit LogUnprovideFunds(msg.sender, previousProviderFunds, newProviderFunds);
    }

    function isProviderLiquid(address _provider, uint256 _gas, uint256 _gasPrice)
        public
        view
        override
        returns(bool)
    {
        return _gas.mul(_gasPrice) <= providerFunds[_provider] ? true : false;
    }

    // Provider Executor: can be set by Provider OR providerExecutor.
    function assignProviderExecutor(address _provider, address _newExecutor) public override {
        require(
            _provider != address(0),
            "GelatoProviders.assignProviderExecutor: _provider AddressZero"
        );
        address currentExecutor = providerExecutor[_provider];
        require(
            currentExecutor != _newExecutor,
            "GelatoProviders.assignProviderExecutor: _newExecutor already set"
        );
        emit LogSetProviderExecutor(_provider, currentExecutor, _newExecutor);
        // Allow providerExecutor to reassign to new Executor when they unstake
        if (msg.sender == currentExecutor) providerExecutor[_provider] = _newExecutor;
        else providerExecutor[msg.sender] = _newExecutor;  // Provider reassigns
        if (currentExecutor != address(0)) {
            executorProvidersCount[currentExecutor].sub(
                1,
                "GelatProviders.assignProviderExecutor: executorProvidersCount undeflow"
            );
        }
        executorProvidersCount[_newExecutor]++;
    }

    // Provider Module
    function addProviderModule(address _module) public override {
        require(_module != address(0), "GelatoProviders.addProviderModule: _module");
        _providerModules[msg.sender].add(_module);
        emit LogAddProviderModule(_module);
    }

    function removeProviderModule(address _module) public override {
        require(_module != address(0), "GelatoProviders.removeProviderModule: _module");
        _providerModules[msg.sender].remove(_module);
        emit LogRemoveProviderModule(_module);
    }

    function batchAddProviderModules(address[] memory _modules) public override {
        for (uint i = 0; i < _modules.length; i++) addProviderModule(_modules[i]);
    }

    function batchRemoveProviderModules(address[] memory _modules) public override {
        for (uint i = 0; i < _modules.length; i++) removeProviderModule(_modules[i]);
    }

    // Providers' Executor Assignment
    function isExecutorAssigned(address _executor) public view override returns(bool) {
        return executorProvidersCount[_executor] == 0;
    }

    // Providers' Module Getters
    function isProviderModule(address _provider, address _module)
        public
        view
        override
        returns(bool)
    {
        return _providerModules[_provider].contains(_module);
    }

    function numOfProviderModules(address _provider) external view override returns(uint256) {
        return _providerModules[_provider].length();
    }

    function providerModules(address _provider)
        external
        view
        override
        returns(address[] memory)
    {
        return _providerModules[_provider].enumerate();
    }

    // Providers' Claims Getters
    function isProviderClaim(address _provider, bytes32 _execClaimHash)
        public
        view
        override
        returns(bool)
    {
        return execClaimHashesByProvider[_provider].contains(_execClaimHash);
    }

    function numOfProviderClaims(address _provider) external view override returns(uint256) {
        return execClaimHashesByProvider[_provider].length();
    }

    function providerClaims(address _provider) external view override returns(bytes32[] memory) {
        return execClaimHashesByProvider[_provider].enumerate();
    }
}