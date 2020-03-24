pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import { IGelatoProviders } from "./interfaces/IGelatoProviders.sol";
import { Address } from "../external/Address.sol";
import { SafeMath } from "../external/SafeMath.sol";
import { IGelatoProviderModule } from "./interfaces/IGelatoProviderModule.sol";
import { EnumerableAddressSet } from "../external/EnumerableAddressSet.sol";
import { EnumerableWordSet } from "../external/EnumerableWordSet.sol";
import { ExecClaim } from "./interfaces/IGelatoCore.sol";

/// @title GelatoProviders
/// @notice APIs for GelatoCore Owner and executorClaimLifespan
/// @dev Find all NatSpecs inside IGelatoCoreAccounting
abstract contract GelatoProviders is IGelatoProviders {

    using Address for address payable;  /// for sendValue method
    using EnumerableAddressSet for EnumerableAddressSet.AddressSet;
    using EnumerableWordSet for EnumerableWordSet.WordSet;
    using SafeMath for uint256;

    mapping(address => uint256) public override providerFunds;
    mapping(address => address) public override providerExecutor;
    mapping(address => uint256) public override providerExecutorFeeCeil;
    mapping(address => uint256) public override providerOracleFeeCeil;
    mapping(address => EnumerableAddressSet.AddressSet) internal _providerModules;
    mapping(address => EnumerableWordSet.WordSet) internal execClaimHashesByProvider;

    // IGelatoProviderModule: Gelato Minting/Execution Gate
    function isProvided(ExecClaim memory _execClaim, uint256 _gelatoGasPrice)
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
        return providerModule.isProvided(
            _execClaim,
            providerExecutor[_execClaim.provider],
            _gelatoGasPrice
        );
    }

    // Registration
    function registerProvider(address _executor, address[] calldata _modules)
        external
        payable
        override
    {
        setProviderExecutor(_executor);
        provideFunds(msg.sender);
        batchAddProviderModules(_modules);
        emit LogRegisterProvider(msg.sender);
    }

    function unregisterProvider(address[] calldata _modules)
        external
        override
    {
        delete providerExecutor[msg.sender];
        unprovideFunds(providerFunds[msg.sender]);
        delete(providerFunds[msg.sender]);
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
        require(_withdrawAmount > 0, "GelatoProviders.unprovideFunds: zero _amount");
        // Checks
        uint256 previousProviderFunding = providerFunds[msg.sender];
        require(
            previousProviderFunding >= _withdrawAmount,
            "GelatoProviders.unprovideFunds: out of funds"
        );
        uint256 newProviderFunding = previousProviderFunding - _withdrawAmount;
        // Effects
        providerFunds[msg.sender] = newProviderFunding;
        // Interaction
        msg.sender.sendValue(_withdrawAmount);
        emit LogUnprovideFunds(msg.sender, previousProviderFunding, newProviderFunding);
    }

    // Provider Executor
    function setProviderExecutor(address _executor) public override {
        require(
            providerExecutor[msg.sender] != _executor,
            "GelatoProviders.setProviderExecutor: _executor already set"
        );
        emit LogSetProviderExecutor(providerExecutor[msg.sender], _executor);
        providerExecutor[msg.sender] = _executor;
    }

    function setProviderExecutorFeeCeil(uint256 _feeCeil) public override {
        require(_feeCeil <= 100, "GelatoProviders.setProviderExecutorFeeCeil: _feeCeil");
        emit LogSetProviderExecutorFeeCeil(providerExecutorFeeCeil[msg.sender], _feeCeil);
        providerExecutorFeeCeil[msg.sender] = _feeCeil;
    }

    // Provider Oracle Fee Ceil
    function setProviderOracleFeeCeil(uint256 _feeCeil) public override {
        require(_feeCeil <= 100, "GelatoProviders.setProviderOracleFeeCeil: _feeCeil");
        emit LogSetProviderOracleFeeCeil(providerOracleFeeCeil[msg.sender], _feeCeil);
        providerOracleFeeCeil[msg.sender] = _feeCeil;
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