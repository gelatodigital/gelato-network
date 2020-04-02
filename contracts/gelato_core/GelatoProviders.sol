pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import { IGelatoProviders } from "./interfaces/IGelatoProviders.sol";
import { GelatoSysAdmin } from "./GelatoSysAdmin.sol";
import { Address } from "../external/Address.sol";
import { SafeMath } from "../external/SafeMath.sol";
import { GelatoString } from "../libraries/GelatoString.sol";
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
    using GelatoString for string;

    mapping(address => uint256) public override providerFunds;
    mapping(address => address) public override providerExecutor;
    mapping(address => uint256) public override executorProvidersCount;
    mapping(address => mapping(address => bool)) public override isConditionProvided;
    mapping(address => mapping(address => uint256)) public override actionGasPriceCeil;
    uint256 public constant override NO_CEIL = 10**18;
    mapping(address => EnumerableAddressSet.AddressSet) internal _providerModules;


    // GelatoCore: mintExecClaim/canExec/collectExecClaimRent Gate
    function isConditionActionProvided(ExecClaim memory _execClaim)
        public
        view
        override
        returns(string memory)
    {
        if (!isConditionProvided[_execClaim.provider][_execClaim.condition])
            return "ConditionNotProvided";
        if (actionGasPriceCeil[_execClaim.provider][_execClaim.action] != 0)
            return "ActionNotProvided";
    }

    // IGelatoProviderModule: Gelato mintExecClaim/canExec Gate
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

    function isExecClaimProvided(ExecClaim memory _execClaim, uint256 _gelatoGasPrice)
        public
        view
        override
        returns(string memory res)
    {
        res = isConditionActionProvided(_execClaim);
        if (res.startsWithOk()) return providerModuleChecks(_execClaim, _gelatoGasPrice);
    }

    function providerCanExec(ExecClaim memory _execClaim, uint256 _gelatoGasPrice)
        public
        view
        override
        returns(string memory res)
    {
        res = isExecClaimProvided(_execClaim, _gelatoGasPrice);
        if (actionGasPriceCeil[_execClaim.provider][_execClaim.action] == NO_CEIL)
            return res;
        else if (res.startsWithOk())
            if (actionGasPriceCeil[_execClaim.provider][_execClaim.action] < _gelatoGasPrice)
                return "GelatoGasPriceAboveActionCeil";
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
            "GelatoProviders.assignProviderExecutor: redundant"
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
    function provideConditions(address[] memory _conditions) public override {
        for (uint i; i < _conditions.length; i++) {
            require(
                !isConditionProvided[msg.sender][_conditions[i]],
                "GelatProviders.provideConditions: redundant"
            );
            isConditionProvided[msg.sender][_conditions[i]] = true;
            emit LogProvideCondition(msg.sender, _conditions[i]);
        }
    }

    function unprovideConditions(address[] memory _conditions) public override {
        for (uint i; i < _conditions.length; i++) {
            require(
                isConditionProvided[msg.sender][_conditions[i]],
                "GelatProviders.unprovideConditions: redundant"
            );
            delete isConditionProvided[msg.sender][_conditions[i]];
            emit LogUnprovideCondition(msg.sender, _conditions[i]);
        }
    }

    // (Un-)provide Actions at different gasPrices
    function provideActions(ActionWithGasPriceCeil[] memory _actions) public override {
        for (uint i; i < _actions.length; i++) {
            if (_actions[i].gasPriceCeil == 0) _actions[i].gasPriceCeil = NO_CEIL;
            uint256 currentGasPriceCeil = actionGasPriceCeil[msg.sender][_actions[i]._address];
            require(
                currentGasPriceCeil != _actions[i].gasPriceCeil,
                "GelatoProviders.provideActions: redundant"
            );
            actionGasPriceCeil[msg.sender][_actions[i]._address] = _actions[i].gasPriceCeil;
            emit LogProvideAction(
                msg.sender,
                _actions[i]._address,
                currentGasPriceCeil,
                _actions[i].gasPriceCeil
            );
        }
    }

    function unprovideActions(address[] memory _actions) public override {
        for (uint i; i < _actions.length; i++) {
            require(
                actionGasPriceCeil[msg.sender][_actions[i]] != 0,
                "GelatoProviders.unprovideActions: redundant"
            );
            delete actionGasPriceCeil[msg.sender][_actions[i]];
            emit LogUnprovideAction(msg.sender, _actions[i]);
        }
    }

    // Provider Module
    function addProviderModules(address[] memory _modules) public override {
        for (uint i; i < _modules.length; i++) {
            require(
                !isProviderModule(msg.sender, _modules[i]),
                "GelatoProviders.addProviderModules: redundant"
            );
            _providerModules[msg.sender].add(_modules[i]);
            emit LogAddProviderModule(msg.sender, _modules[i]);
        }
    }

    function removeProviderModules(address[] memory _modules) public override {
        for (uint i; i < _modules.length; i++) {
            require(
                isProviderModule(msg.sender, _modules[i]),
                "GelatoProviders.removeProviderModules: redundant"
            );
            _providerModules[msg.sender].remove(_modules[i]);
            emit LogRemoveProviderModule(msg.sender, _modules[i]);
        }
    }

    // Batch (un-)provide
    function batchProvide(
        address[] memory _conditions,
        ActionWithGasPriceCeil[] memory _actions,
        address[] memory _modules
    )
        public
        payable
        override
    {
        if (msg.value != 0) provideFunds(msg.sender);
        provideConditions(_conditions);
        provideActions(_actions);
        addProviderModules(_modules);
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
        unprovideConditions(_conditions);
        unprovideActions(_actions);
        removeProviderModules(_modules);
    }

    // Provider Liquidity
    function isProviderLiquid(address _provider) public view override returns(bool) {
        return minProviderStake <= providerFunds[_provider] ? true : false;
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