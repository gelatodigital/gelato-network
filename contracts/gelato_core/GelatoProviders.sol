// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import {IGelatoProviders, TaskSpec} from "./interfaces/IGelatoProviders.sol";
import {GelatoSysAdmin} from "./GelatoSysAdmin.sol";
import {Address} from "../external/Address.sol";
import {GelatoString} from "../libraries/GelatoString.sol";
import {Math} from "../external/Math.sol";
import {SafeMath} from "../external/SafeMath.sol";
import {IGelatoProviderModule} from "../gelato_provider_modules/IGelatoProviderModule.sol";
import {ProviderModuleSet} from "../libraries/ProviderModuleSet.sol";
import {
    Condition, Action, Operation, DataFlow, Provider, Task, TaskReceipt
} from "./interfaces/IGelatoCore.sol";
import {IGelatoCondition} from "../gelato_conditions/IGelatoCondition.sol";

/// @title GelatoProviders
/// @notice Provider Management API - Whitelist TaskSpecs
/// @dev Find all NatSpecs inside IGelatoProviders
abstract contract GelatoProviders is IGelatoProviders, GelatoSysAdmin {

    using Address for address payable;  /// for sendValue method
    using GelatoString for string;
    using ProviderModuleSet for ProviderModuleSet.Set;
    using SafeMath for uint256;

    // This is only for internal use by hashTaskSpec()
    struct NoDataAction {
        address addr;
        Operation operation;
        DataFlow dataFlow;
        bool value;
        bool termsOkCheck;
    }

    uint256 public constant override NO_CEIL = type(uint256).max;

    mapping(address => uint256) public override providerFunds;
    mapping(address => uint256) public override executorStake;
    mapping(address => address) public override executorByProvider;
    mapping(address => uint256) public override executorProvidersCount;
    // The Task-Spec Gas-Price-Ceil => taskSpecGasPriceCeil
    mapping(address => mapping(bytes32 => uint256)) public override taskSpecGasPriceCeil;
    mapping(address => ProviderModuleSet.Set) internal _providerModules;

    // GelatoCore: canSubmit
    function isTaskSpecProvided(address _provider, TaskSpec memory _taskSpec)
        public
        view
        override
        returns(string memory)
    {
        if (taskSpecGasPriceCeil[_provider][hashTaskSpec(_taskSpec)] == 0)
            return "TaskSpecNotProvided";
        return OK;
    }

    // IGelatoProviderModule: GelatoCore canSubmit & canExec
    function providerModuleChecks(
        address _userProxy,
        Provider memory _provider,
        Task memory _task
    )
        public
        view
        override
        returns(string memory)
    {
        if (!isModuleProvided(_provider.addr, _provider.module))
            return "InvalidProviderModule";

        if (_userProxy != _provider.addr) {
            IGelatoProviderModule providerModule = IGelatoProviderModule(
                _provider.module
            );

            try providerModule.isProvided(_userProxy, _provider.addr, _task)
                returns(string memory res)
            {
                return res;
            } catch {
                return "GelatoProviders.providerModuleChecks";
            }
        } else return OK;
    }

    // GelatoCore: canSubmit
    function isTaskProvided(
        address _userProxy,
        Provider memory _provider,
        Task memory _task
    )
        public
        view
        override
        returns(string memory res)
    {
        TaskSpec memory _taskSpec = _castTaskToSpec(_task);
        res = isTaskSpecProvided(_provider.addr, _taskSpec);
        if (res.startsWithOK())
            return providerModuleChecks(_userProxy, _provider, _task);
    }

    // GelatoCore canExec Gate
    function providerCanExec(
        address _userProxy,
        Provider memory _provider,
        Task memory _task,
        uint256 _gelatoGasPrice
    )
        public
        view
        override
        returns(string memory)
    {
        if (_userProxy == _provider.addr) {
            if (_task.selfProviderGasPriceCeil < _gelatoGasPrice)
                return "SelfProviderGasPriceCeil";
        } else {
            bytes32 taskSpecHash = hashTaskSpec(_castTaskToSpec(_task));
            if (taskSpecGasPriceCeil[_provider.addr][taskSpecHash] < _gelatoGasPrice)
                return "taskSpecGasPriceCeil-OR-notProvided";
        }
        return providerModuleChecks(_userProxy, _provider, _task);
    }

    // Provider Funding
    function provideFunds(address _provider) public payable override {
        require(msg.value > 0, "GelatoProviders.provideFunds: zero value");
        uint256 newProviderFunds = providerFunds[_provider].add(msg.value);
        emit LogFundsProvided(_provider, msg.value, newProviderFunds);
        providerFunds[_provider] = newProviderFunds;
    }

    // Unprovide funds
    function unprovideFunds(uint256 _withdrawAmount)
        public
        override
        returns(uint256 realWithdrawAmount)
    {
        uint256 previousProviderFunds = providerFunds[msg.sender];
        realWithdrawAmount = Math.min(_withdrawAmount, previousProviderFunds);

        uint256 newProviderFunds = previousProviderFunds - realWithdrawAmount;

        // Effects
        providerFunds[msg.sender] = newProviderFunds;

        // Interaction
        msg.sender.sendValue(realWithdrawAmount);

        emit LogFundsUnprovided(msg.sender, realWithdrawAmount, newProviderFunds);
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

        // EFFECTS: Provider reassigns from currentExecutor to newExecutor (or no executor)
        if (currentExecutor != address(0)) executorProvidersCount[currentExecutor]--;
        executorByProvider[msg.sender] = _newExecutor;
        if (_newExecutor != address(0)) executorProvidersCount[_newExecutor]++;

        emit LogProviderAssignedExecutor(msg.sender, currentExecutor, _newExecutor);
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

        // EFFECTS: currentExecutor reassigns to newExecutor
        executorProvidersCount[currentExecutor]--;
        executorByProvider[_provider] = _newExecutor;
        executorProvidersCount[_newExecutor]++;

        emit LogExecutorAssignedExecutor(_provider, currentExecutor, _newExecutor);
    }

    // (Un-)provide Condition Action Combos at different Gas Price Ceils
    function provideTaskSpecs(TaskSpec[] memory _taskSpecs) public override {
        for (uint i; i < _taskSpecs.length; i++) {
            if (_taskSpecs[i].gasPriceCeil == 0) _taskSpecs[i].gasPriceCeil = NO_CEIL;
            bytes32 taskSpecHash = hashTaskSpec(_taskSpecs[i]);
            setTaskSpecGasPriceCeil(taskSpecHash, _taskSpecs[i].gasPriceCeil);
            emit LogTaskSpecProvided(msg.sender, taskSpecHash);
        }
    }

    function unprovideTaskSpecs(TaskSpec[] memory _taskSpecs) public override {
        for (uint i; i < _taskSpecs.length; i++) {
            bytes32 taskSpecHash = hashTaskSpec(_taskSpecs[i]);
            require(
                taskSpecGasPriceCeil[msg.sender][taskSpecHash] != 0,
                "GelatoProviders.unprovideTaskSpecs: redundant"
            );
            delete taskSpecGasPriceCeil[msg.sender][taskSpecHash];
            emit LogTaskSpecUnprovided(msg.sender, taskSpecHash);
        }
    }

    function setTaskSpecGasPriceCeil(bytes32 _taskSpecHash, uint256 _gasPriceCeil)
        public
        override
    {
            uint256 currentTaskSpecGasPriceCeil = taskSpecGasPriceCeil[msg.sender][_taskSpecHash];
            require(
                currentTaskSpecGasPriceCeil != _gasPriceCeil,
                "GelatoProviders.setTaskSpecGasPriceCeil: Already whitelisted with gasPriceCeil"
            );
            taskSpecGasPriceCeil[msg.sender][_taskSpecHash] = _gasPriceCeil;
            emit LogTaskSpecGasPriceCeilSet(
                msg.sender,
                _taskSpecHash,
                currentTaskSpecGasPriceCeil,
                _gasPriceCeil
            );
    }

    // Provider Module
    function addProviderModules(IGelatoProviderModule[] memory _modules) public override {
        for (uint i; i < _modules.length; i++) {
            require(
                !isModuleProvided(msg.sender, _modules[i]),
                "GelatoProviders.addProviderModules: redundant"
            );
            _providerModules[msg.sender].add(_modules[i]);
            emit LogProviderModuleAdded(msg.sender, _modules[i]);
        }
    }

    function removeProviderModules(IGelatoProviderModule[] memory _modules) public override {
        for (uint i; i < _modules.length; i++) {
            require(
                isModuleProvided(msg.sender, _modules[i]),
                "GelatoProviders.removeProviderModules: redundant"
            );
            _providerModules[msg.sender].remove(_modules[i]);
            emit LogProviderModuleRemoved(msg.sender, _modules[i]);
        }
    }

    // Batch (un-)provide
    function multiProvide(
        address _executor,
        TaskSpec[] memory _taskSpecs,
        IGelatoProviderModule[] memory _modules
    )
        public
        payable
        override
    {
        if (msg.value != 0) provideFunds(msg.sender);
        if (_executor != address(0)) providerAssignsExecutor(_executor);
        provideTaskSpecs(_taskSpecs);
        addProviderModules(_modules);
    }

    function multiUnprovide(
        uint256 _withdrawAmount,
        TaskSpec[] memory _taskSpecs,
        IGelatoProviderModule[] memory _modules
    )
        public
        override
    {
        if (_withdrawAmount != 0) unprovideFunds(_withdrawAmount);
        unprovideTaskSpecs(_taskSpecs);
        removeProviderModules(_modules);
    }

    // Provider Liquidity
    function minExecProviderFunds(uint256 _gelatoMaxGas, uint256 _gelatoGasPrice)
        public
        view
        override
        returns(uint256)
    {
        uint256 maxExecTxCost = (EXEC_TX_OVERHEAD + _gelatoMaxGas) * _gelatoGasPrice;
        return maxExecTxCost + (maxExecTxCost * totalSuccessShare) / 100;
    }

    function isProviderLiquid(
        address _provider,
        uint256 _gelatoMaxGas,
        uint256 _gelatoGasPrice
    )
        public
        view
        override
        returns(bool)
    {
        return minExecProviderFunds(_gelatoMaxGas, _gelatoGasPrice) <= providerFunds[_provider];
    }

    // An Executor qualifies and remains registered for as long as he has minExecutorStake
    function isExecutorMinStaked(address _executor) public view override returns(bool) {
        return executorStake[_executor] >= minExecutorStake;
    }

    // Providers' Executor Assignment
    function isExecutorAssigned(address _executor) public view override returns(bool) {
        return executorProvidersCount[_executor] != 0;
    }

    // Helper fn that can also be called to query taskSpecHash off-chain
    function hashTaskSpec(TaskSpec memory _taskSpec) public view override returns(bytes32) {
        NoDataAction[] memory noDataActions = new NoDataAction[](_taskSpec.actions.length);
        for (uint i = 0; i < _taskSpec.actions.length; i++) {
            NoDataAction memory noDataAction = NoDataAction({
                addr: _taskSpec.actions[i].addr,
                operation: _taskSpec.actions[i].operation,
                dataFlow: _taskSpec.actions[i].dataFlow,
                value: _taskSpec.actions[i].value == 0 ? false : true,
                termsOkCheck: _taskSpec.actions[i].termsOkCheck
            });
            noDataActions[i] = noDataAction;
        }
        return keccak256(abi.encode(_taskSpec.conditions, noDataActions));
    }

    // Providers' Module Getters
    function isModuleProvided(address _provider, IGelatoProviderModule _module)
        public
        view
        override
        returns(bool)
    {
        return _providerModules[_provider].contains(_module);
    }

    function providerModules(address _provider)
        external
        view
        override
        returns(IGelatoProviderModule[] memory)
    {
        return _providerModules[_provider].enumerate();
    }

    // Internal helper for is isTaskProvided() and providerCanExec
    function _castTaskToSpec(Task memory _task)
        private
        pure
        returns(TaskSpec memory taskSpec)
    {
        taskSpec = TaskSpec({
            conditions: _stripConditionData(_task.conditions),
            actions: _task.actions,
            gasPriceCeil: 0  // default: provider can set gasPriceCeil dynamically.
        });
    }

    function _stripConditionData(Condition[] memory _conditionsWithData)
        private
        pure
        returns(IGelatoCondition[] memory conditionInstances)
    {
        conditionInstances = new IGelatoCondition[](_conditionsWithData.length);
        for (uint i; i < _conditionsWithData.length; i++)
            conditionInstances[i] = _conditionsWithData[i].inst;
    }

}
