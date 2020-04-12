pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { IGelatoProviders } from "./interfaces/IGelatoProviders.sol";
import { GelatoSysAdmin } from "./GelatoSysAdmin.sol";
import { Address } from "../external/Address.sol";
import { SafeMath } from "../external/SafeMath.sol";
import { Math } from "../external/Math.sol";
import { IGelatoProviderModule } from "./interfaces/IGelatoProviderModule.sol";
import { EnumerableAddressSet } from "../external/EnumerableAddressSet.sol";
import { ExecClaim } from "./interfaces/IGelatoCore.sol";
import { GelatoString } from "../libraries/GelatoString.sol";

/// @title GelatoProviders
/// @notice APIs for GelatoCore Owner and execClaimTenancy
/// @dev Find all NatSpecs inside IGelatoCoreAccounting
abstract contract GelatoProviders is IGelatoProviders, GelatoSysAdmin {

    using Address for address payable;  /// for sendValue method
    using EnumerableAddressSet for EnumerableAddressSet.AddressSet;
    using SafeMath for uint256;
    using GelatoString for string;

    uint256 public constant override NO_CEIL = 2**256 - 1;  // MaxUint256

    mapping(address => uint256) public override providerFunds;
    mapping(address => uint256) public override executorStake;
    mapping(address => address) public override executorByProvider;
    mapping(address => uint256) public override executorProvidersCount;
    mapping(address => mapping(address => bool)) public override isConditionProvided;
    mapping(address => mapping(bytes32 => uint256)) public override actionGasPriceCeil;
    mapping(address => EnumerableAddressSet.AddressSet) internal _providerModules;

    // GelatoCore: mintExecClaim/collectExecClaimRent Gate
    function isConditionActionProvided(ExecClaim memory _ec)
        public
        view
        override
        returns(string memory)
    {
        if (_ec.task.condition != address(0)) {
            if (!isConditionProvided[_ec.task.provider][_ec.task.condition])
                return "ConditionNotProvided";
        }

        bytes32 actionsHash = keccak256(abi.encode(_ec.task.actions));
        if (actionGasPriceCeil[_ec.task.provider][actionsHash] == 0)
            return "ActionNotProvided";
        return "Ok";
    }

    // IGelatoProviderModule: GelatoCore mintExecClaim/canExec Gate
    function providerModuleChecks(ExecClaim memory _ec)
        public
        view
        override
        returns(string memory)
    {
        if (!isProviderModule(_ec.task.provider, _ec.task.providerModule))
            return "InvalidProviderModule";

        IGelatoProviderModule providerModule = IGelatoProviderModule(
            _ec.task.providerModule
        );

        try providerModule.isProvided(_ec) returns(string memory res) {
            return res;
        } catch {
            return "GelatoProviders.providerModuleChecks";
        }
    }

    // GelatoCore: combined mintExecClaim Gate
    function isExecClaimProvided(ExecClaim memory _ec)
        public
        view
        override
        returns(string memory res)
    {
        res = isConditionActionProvided(_ec);
        if (res.startsWithOk()) return providerModuleChecks(_ec);
    }

    // GelatoCore canExec Gate
    function providerCanExec(ExecClaim memory _ec, uint256 _gelatoGasPrice)
        public
        view
        override
        returns(string memory)
    {
        // Will only return if a) action is not whitelisted & b) gelatoGasPrice is higher than gasPriceCeiling
        bytes32 actionsHash = keccak256(abi.encode(_ec.task.actions));
        if (_gelatoGasPrice > actionGasPriceCeil[_ec.task.provider][actionsHash])
            return "GelatoGasPriceTooHigh";

        // 3. Check if condition is whitelisted by provider
        if (_ec.task.condition != address(0)) {
            if (!isConditionProvided[_ec.task.provider][_ec.task.condition])
                return "ConditionNotProvided";
        }

        return providerModuleChecks(_ec);
    }

    // Provider Funding
    function provideFunds(address _provider) public payable override {
        require(msg.value > 0, "GelatoProviders.provideFunds: zero value");
        uint256 newProviderFunds = providerFunds[_provider].add(msg.value);
        emit LogProvideFunds(_provider, msg.value, newProviderFunds);
        providerFunds[_provider] = newProviderFunds;
    }

    function unprovideFunds(uint256 _withdrawAmount)
        public
        override
        returns (uint256 realWithdrawAmount)
    {
        address currentExecutor = executorByProvider[msg.sender];
        require(
            currentExecutor == address(0),
            "GelatoProviders.unprovideFunds: Must un-assign executor first"
        );

        uint256 previousProviderFunds = providerFunds[msg.sender];
        realWithdrawAmount = Math.min(_withdrawAmount, previousProviderFunds);
        uint256 newProviderFunds = previousProviderFunds - realWithdrawAmount;

        // Effects
        providerFunds[msg.sender] = newProviderFunds;

        // Interaction
        msg.sender.sendValue(realWithdrawAmount);

        emit LogUnprovideFunds(msg.sender, realWithdrawAmount, newProviderFunds);
    }

    // Called by Providers
    function providerAssignsExecutor(address _newExecutor) public override {
        address currentExecutor = executorByProvider[msg.sender];

        // CHECKS
        require(
            currentExecutor != _newExecutor,
            "GelatoProviders.providerAssignsExecutor: already assigned."
        );
        if (_newExecutor != address(0)) {
            require(
                isExecutorMinStaked(_newExecutor),
                "GelatoProviders.providerAssignsExecutor: isExecutorMinStaked()"
            );
        }
        require(
            isProviderMinStaked(msg.sender),
            "GelatoProviders.providerAssignsExecutor: isProviderMinStaked()"
        );

        // EFFECTS: Provider reassigns from currentExecutor to newExecutor (or no executor)
        if (currentExecutor != address(0)) executorProvidersCount[currentExecutor]--;
        executorByProvider[msg.sender] = _newExecutor;
        if (_newExecutor != address(0)) executorProvidersCount[_newExecutor]++;

        emit LogProviderAssignsExecutor(msg.sender, currentExecutor, _newExecutor);
    }

    // Called by Executors
    function executorAssignsExecutor(address _provider, address _newExecutor) public override {
        address currentExecutor = executorByProvider[_provider];

        // CHECKS
        require(
            currentExecutor == msg.sender,
            "GelatoProviders.executorAssignsExecutor: msg.sender is not assigned executor"
        );
        require(
            currentExecutor != _newExecutor,
            "GelatoProviders.executorAssignsExecutor: already assigned."
        );
        // Checks at the same time if _nexExecutor != address(0)
        require(
            isExecutorMinStaked(_newExecutor),
            "GelatoProviders.executorAssignsExecutor: isExecutorMinStaked()"
        );
        require(
            isProviderMinStaked(_provider),
            "GelatoProviders.executorAssignsExecutor: isProviderMinStaked()"
        );

        // EFFECTS: currentExecutor reassigns to newExecutor
        executorProvidersCount[currentExecutor]--;
        executorByProvider[_provider] = _newExecutor;
        executorProvidersCount[_newExecutor]++;

        emit LogExecutorAssignsExecutor(_provider, currentExecutor, _newExecutor);
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
    function provideActions(ActionsWithGasPriceCeil[] memory _actions) public override {
        for (uint i; i < _actions.length; i++) {
            if (_actions[i].gasPriceCeil == 0) _actions[i].gasPriceCeil = NO_CEIL;

            bytes32 actionsHash = keccak256(abi.encode(_actions[i].addresses));

            uint256 currentGasPriceCeil = actionGasPriceCeil[msg.sender][actionsHash];
            require(
                currentGasPriceCeil != _actions[i].gasPriceCeil,
                "GelatoProviders.provideActions: redundant"
            );
            actionGasPriceCeil[msg.sender][actionsHash] = _actions[i].gasPriceCeil;
            emit LogProvideAction(
                msg.sender,
                actionsHash,
                currentGasPriceCeil,
                _actions[i].gasPriceCeil
            );
        }
    }

    function unprovideActions(ActionsArray[] memory _actionsArray) public override {
        for (uint i; i < _actionsArray.length; i++) {
            bytes32 actionsHash = keccak256(abi.encode(_actionsArray[i]));
            require(
                actionGasPriceCeil[msg.sender][actionsHash] != 0,
                "GelatoProviders.unprovideActions: redundant"
            );
            delete actionGasPriceCeil[msg.sender][actionsHash];
            emit LogUnprovideAction(msg.sender, actionsHash);
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
        address _executor,
        address[] memory _conditions,
        ActionsWithGasPriceCeil[] memory _actions,
        address[] memory _modules
    )
        public
        payable
        override
    {
        if (msg.value != 0) provideFunds(msg.sender);
        if (_executor != address(0)) providerAssignsExecutor(_executor);
        provideConditions(_conditions);
        provideActions(_actions);
        addProviderModules(_modules);
    }

    function batchUnprovide(
        uint256 _withdrawAmount,
        address[] memory _conditions,
        ActionsArray[] memory _actions,
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
    function isProviderMinStaked(address _provider) public view override returns(bool) {
        return providerFunds[_provider] >= minProviderStake;
    }

    // An Executor qualifies and remains registered for as long as he has minExecutorStake
    function isExecutorMinStaked(address _executor) public view override returns(bool) {
        return executorStake[_executor] >= minExecutorStake;
    }

    // Providers' Executor Assignment
    function isExecutorAssigned(address _executor) public view override returns(bool) {
        return executorProvidersCount[_executor] != 0;
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
