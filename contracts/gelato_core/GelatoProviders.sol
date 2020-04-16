pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { IGelatoProviders } from "./interfaces/IGelatoProviders.sol";
import { GelatoSysAdmin } from "./GelatoSysAdmin.sol";
import { Address } from "../external/Address.sol";
import { SafeMath } from "../external/SafeMath.sol";
import { Math } from "../external/Math.sol";
import { IGelatoProviderModule } from "./interfaces/IGelatoProviderModule.sol";
import { ProviderModuleSet } from "../libraries/ProviderModuleSet.sol";
import { Action, Operation, ExecClaim } from "./interfaces/IGelatoCore.sol";
import { GelatoString } from "../libraries/GelatoString.sol";
import { IGelatoCondition } from "../gelato_conditions/IGelatoCondition.sol";

/// @title GelatoProviders
/// @notice APIs for GelatoCore Owner and execClaimTenancy
/// @dev Find all NatSpecs inside IGelatoCoreAccounting
abstract contract GelatoProviders is IGelatoProviders, GelatoSysAdmin {

    using Address for address payable;  /// for sendValue method
    using ProviderModuleSet for ProviderModuleSet.Set;
    using SafeMath for uint256;
    using GelatoString for string;

    // This is only for internal use by camHash()
    struct NoDataAction {
        address inst;
        Operation operation;
        bool termsOkCheck;
    }

    uint256 public constant override NO_CEIL = 2**256 - 1;  // MaxUint256

    mapping(address => uint256) public override providerFunds;
    mapping(address => uint256) public override executorStake;
    mapping(address => address) public override executorByProvider;
    mapping(address => uint256) public override executorProvidersCount;
    // The Condition-Actions-Combo Gas-Price-Ceil => camGPC
    mapping(address => mapping(bytes32 => uint256)) public override camGPC;
    mapping(address => ProviderModuleSet.Set) internal _providerModules;

    // GelatoCore: mintExecClaim/collectExecClaimRent Gate
    function isCAMProvided(
        address _provider,
        IGelatoCondition _condition,
        Action[] memory _actions
    )
        public
        view
        override
        returns(string memory)
    {
        bytes32 camHash = camHash(_condition, _actions);
        if (camGPC[_provider][camHash] == 0) return "ConditionActionsMixNotProvided";
        return "Ok";
    }

    // IGelatoProviderModule: GelatoCore mintExecClaim/canExec Gate
    function providerModuleChecks(ExecClaim memory _ec)
        public
        view
        override
        returns(string memory)
    {
        if (!isModuleProvided(_ec.task.provider.addr, _ec.task.provider.module))
            return "InvalidProviderModule";

        IGelatoProviderModule providerModule = IGelatoProviderModule(
            _ec.task.provider.module
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
        res = isCAMProvided(_ec.task.provider.addr, _ec.task.condition.inst, _ec.task.actions);
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
        bytes32 camHash = camHash(_ec.task.condition.inst, _ec.task.actions);
        if (_gelatoGasPrice > camGPC[_ec.task.provider.addr][camHash])
            return "GelatoGasPriceTooHigh";
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
        returns(uint256 realWithdrawAmount)
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
            isProviderMinFunded(msg.sender),
            "GelatoProviders.providerAssignsExecutor: isProviderMinFunded()"
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
            isProviderMinFunded(_provider),
            "GelatoProviders.executorAssignsExecutor: isProviderMinFunded()"
        );

        // EFFECTS: currentExecutor reassigns to newExecutor
        executorProvidersCount[currentExecutor]--;
        executorByProvider[_provider] = _newExecutor;
        executorProvidersCount[_newExecutor]++;

        emit LogExecutorAssignsExecutor(_provider, currentExecutor, _newExecutor);
    }

    // (Un-)provide Condition Action Combos at different Gas Price Ceils
    function provideCAMs(ConditionActionsMix[] memory _CAMs) public override {
        for (uint i; i < _CAMs.length; i++) {
            if (_CAMs[i].gasPriceCeil == 0) _CAMs[i].gasPriceCeil = NO_CEIL;
            bytes32 camHash = camHash(_CAMs[i].condition, _CAMs[i].actions);
            setCAMGPC(camHash, _CAMs[i].gasPriceCeil);
            emit LogProvideCAM(msg.sender, camHash);
        }
    }

    function unprovideCAMs(ConditionActionsMix[] memory _CAMs) public override {
        for (uint i; i < _CAMs.length; i++) {
            bytes32 camHash = camHash(_CAMs[i].condition, _CAMs[i].actions);
            require(
                camGPC[msg.sender][camHash] != 0,
                "GelatoProviders.unprovideCAMs: redundant"
            );
            delete camGPC[msg.sender][camHash];
            emit LogUnprovideCAM(msg.sender, camHash);
        }
    }

    function setCAMGPC(bytes32 _camHash, uint256 _gasPriceCeil) public override {
            uint256 currentCAMGPC = camGPC[msg.sender][_camHash];
            require(
                currentCAMGPC != _gasPriceCeil,
                "GelatoProviders.setCAMGPC: redundant"
            );
            camGPC[msg.sender][_camHash] = _gasPriceCeil;
            emit LogSetCAMGPC(msg.sender, _camHash, currentCAMGPC, _gasPriceCeil);
    }

    // Provider Module
    function addProviderModules(IGelatoProviderModule[] memory _modules) public override {
        for (uint i; i < _modules.length; i++) {
            require(
                !isModuleProvided(msg.sender, _modules[i]),
                "GelatoProviders.addProviderModules: redundant"
            );
            _providerModules[msg.sender].add(_modules[i]);
            emit LogAddProviderModule(msg.sender, _modules[i]);
        }
    }

    function removeProviderModules(IGelatoProviderModule[] memory _modules) public override {
        for (uint i; i < _modules.length; i++) {
            require(
                isModuleProvided(msg.sender, _modules[i]),
                "GelatoProviders.removeProviderModules: redundant"
            );
            _providerModules[msg.sender].remove(_modules[i]);
            emit LogRemoveProviderModule(msg.sender, _modules[i]);
        }
    }

    // Batch (un-)provide
    function batchProvide(
        address _executor,
        ConditionActionsMix[] memory _CAMs,
        IGelatoProviderModule[] memory _modules
    )
        public
        payable
        override
    {
        if (msg.value != 0) provideFunds(msg.sender);
        if (_executor != address(0)) providerAssignsExecutor(_executor);
        provideCAMs(_CAMs);
        addProviderModules(_modules);
    }

    function batchUnprovide(
        uint256 _withdrawAmount,
        ConditionActionsMix[] memory _CAMs,
        IGelatoProviderModule[] memory _modules
    )
        public
        override
    {
        if (_withdrawAmount != 0) unprovideFunds(_withdrawAmount);
        unprovideCAMs(_CAMs);
        removeProviderModules(_modules);
    }

    // Provider Liquidity
    function isProviderMinFunded(address _provider) public view override returns(bool) {
        return providerFunds[_provider] >= minProviderFunds;
    }

    // An Executor qualifies and remains registered for as long as he has minExecutorStake
    function isExecutorMinStaked(address _executor) public view override returns(bool) {
        return executorStake[_executor] >= minExecutorStake;
    }

    // Providers' Executor Assignment
    function isExecutorAssigned(address _executor) public view override returns(bool) {
        return executorProvidersCount[_executor] != 0;
    }

    // Helper fn that can also be called to query camHash off-chain
    function camHash(IGelatoCondition _condition, Action[] memory _actions)
        public
        view
        override
        returns(bytes32)
    {
        NoDataAction[] memory noDataActions = new NoDataAction[](_actions.length);
        for (uint i = 0; i < _actions.length; i++) {
            NoDataAction memory noDataAction = NoDataAction({
                inst: _actions[i].inst,
                operation: _actions[i].operation,
                termsOkCheck: _actions[i].termsOkCheck
            });
            noDataActions[i] = noDataAction;
        }
        return keccak256(abi.encode(_condition, noDataActions));
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

    function numOfProviderModules(address _provider) external view override returns(uint256) {
        return _providerModules[_provider].length();
    }

    function providerModules(address _provider)
        external
        view
        override
        returns(IGelatoProviderModule[] memory)
    {
        return _providerModules[_provider].enumerate();
    }
}
