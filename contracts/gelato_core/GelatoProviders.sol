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
    using SafeMath for uint256;

    mapping(address => uint256) public override providerFunds;
    mapping(address => address) public override providerExecutor;
    mapping(address => uint256) public override executorProvidersCount;
    mapping(address => mapping(address => bool)) public override isConditionProvided;
    mapping(address => mapping(address => bool)) public override isActionProvided;
    mapping(address => EnumerableAddressSet.AddressSet) internal _providerModules;

    // IGelatoProviderModule: Gelato Minting/Execution Gate
    function coreProviderChecks(ExecClaim memory _execClaim)
        public
        view
        override
        returns(bool)
    {
        if (!isConditionProvided[_execClaim.provider][_execClaim.condition]) return false;
        if (!isActionProvided[_execClaim.provider][_execClaim.action]) return false;
        return true;
    }

    function providerModuleChecks(ExecClaim memory _execClaim, uint256 _gelatoGasPrice)
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
        return providerModule.isProvided(_execClaim, _gelatoGasPrice);
    }

    function combinedProviderChecks(ExecClaim memory _execClaim, uint256 _gelatoGasPrice)
        public
        view
        override
        returns(string memory)
    {
        if (!coreProviderChecks(_execClaim)) return "ConditionOrActionNotProvided";
        return providerModuleChecks(_execClaim, _gelatoGasPrice);
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
        emit LogAssignProviderExecutor(_provider, currentExecutor, _newExecutor);
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

    // (Un-)provide Conditions
    function provideCondition(address _condition) public override {
        require(
            !isConditionProvided[msg.sender][_condition],
            "GelatProviders.provideCondition: already provided"
        );
        isConditionProvided[msg.sender][_condition] = true;
        emit LogProvideCondition(msg.sender, _condition);
    }

    function unprovideCondition(address _condition) public override {
        require(
            isConditionProvided[msg.sender][_condition],
            "GelatProviders.unprovideCondition: already not provided"
        );
        delete isConditionProvided[msg.sender][_condition];
        emit LogUnprovideCondition(msg.sender, _condition);
    }

    // (Un-)provide Actions at different gasPrices
    function provideAction(address _action) public override onlyOwner {
        require(
            !isActionProvided[msg.sender][_action],
            "GelatProviders.provideCondition: already provided"
        );
        isActionProvided[msg.sender][_action] = true;
        emit LogProvideAction(msg.sender, _action);
    }

    function unprovideAction(address _action) public override onlyOwner {
        require(
            isActionProvided[msg.sender][_action],
            "GelatProviders.unprovideCondition: already not provided"
        );
        delete isActionProvided[msg.sender][_action];
        emit LogUnprovideAction(msg.sender, _action);
    }

    // Provider Module
    function addProviderModule(address _module) public override {
        require(_module != address(0), "GelatoProviders.addProviderModule: _module");
        _providerModules[msg.sender].add(_module);
        emit LogAddProviderModule(msg.sender, _module);
    }

    function removeProviderModule(address _module) public override {
        require(_module != address(0), "GelatoProviders.removeProviderModule: _module");
        _providerModules[msg.sender].remove(_module);
        emit LogRemoveProviderModule(msg.sender, _module);
    }

    // Batch (un-)provide
    function batchProvide(
        address _executor,
        address[] memory _conditions,
        address[] memory _actions,
        address[] memory _modules
    )
        public
        payable
        override
    {
        if (msg.value != 0) provideFunds(msg.sender);
        if (_executor != address(0)) assignProviderExecutor(msg.sender, _executor);
        for (uint256 i = 0; i < _conditions.length; i++)
            if (_conditions[i] != address(0)) provideCondition(_conditions[i]);
        for (uint256 i = 0; i < _actions.length; i++)
            if (_actions[i] != address(0)) provideAction(_actions[i]);
        for (uint256 i = 0; i < _modules.length; i++)
            if (_modules[i] != address(0)) addProviderModule(_modules[i]);
    }

    function batchUnprovide(
        uint256 _withdrawAmount,
        address[] memory _conditions,
        address[] memory _actions,
        address[] memory _modules
    )
        public
        override
    {
        if (_withdrawAmount != 0) unprovideFunds(_withdrawAmount);
        for (uint256 i = 0; i < _conditions.length; i++)
            if (_conditions[i] != address(0)) unprovideCondition(_conditions[i]);
        for (uint256 i = 0; i < _actions.length; i++)
            if (_actions[i] != address(0)) unprovideAction(_actions[i]);
        for (uint256 i = 0; i < _modules.length; i++)
            if (_modules[i] != address(0)) removeProviderModule(_modules[i]);
    }

    // Provider Liquidity
    function isProviderLiquid(address _provider, uint256 _gas, uint256 _gasPrice)
        public
        view
        override
        returns(bool)
    {
        return _gas.mul(_gasPrice) <= providerFunds[_provider] ? true : false;
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

}