pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import { IGelatoProviders } from "./interfaces/IGelatoProviders.sol";
import { GelatoSysAdmin } from "./GelatoSysAdmin.sol";
import { Address } from "../external/Address.sol";
import { SafeMath } from "../external/SafeMath.sol";
import { Math } from "../external/Math.sol";
import { IGelatoProviderModule } from "./interfaces/IGelatoProviderModule.sol";
import { EnumerableAddressSet } from "../external/EnumerableAddressSet.sol";
import { EnumerableWordSet } from "../external/EnumerableWordSet.sol";
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

    mapping(address => uint256) public override providerFunds;
    mapping(address => mapping(address => bool)) public override isConditionProvided;
    mapping(address => mapping(address => uint256)) public override actionGasPriceCeil;
    mapping(address => address) public override providerExecutor;
    mapping(address => uint256) public override executorProvidersCount;
    mapping(address => EnumerableAddressSet.AddressSet) internal _providerModules;

    // Constants
    uint256 public constant actionMaxGasPriceCeil = 1 ether;

    // IGelatoProviderModule: Gelato Minting Gate
    function providerModuleCheck(
        ExecClaim memory _execClaim
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

        return providerModule.providerModuleCheck(_execClaim);
    }

    // IGelatoProviderModule: Gelato Execution Gate
    function providerCheck (
        ExecClaim memory _execClaim,
        uint256 _gelatoGasPrice
    )
        public
        view
        override
        returns(string memory)
    {
        // 1. Check if provider module returns OK
        string memory providerModuleCheckReturn = providerModuleCheck(_execClaim);
        if (!providerModuleCheckReturn.startsWithOk()) return providerModuleCheckReturn;

        // @DEV if we pass 0 (minting and renewing) as _gelatoGasPrice, we only check if action is whitelisted and not
        // the actual actionGasPriceCeil
        if (_gelatoGasPrice == 0) {
            // 2. Check if action is whitelisted by provider
            if (actionGasPriceCeil[_execClaim.provider][_execClaim.action] == 0)
                return "ProviderModuleGnosisSafeProxy.isProvided:ActionNotProvided";
        } else {
            // 2. Check if action is whitelisted && if actionGasPriceCeil is greater than current
            // gelatoGasPrice
            if (_gelatoGasPrice > actionGasPriceCeil[_execClaim.provider][_execClaim.action])
                return "ProviderModuleGnosisSafeProxy.isProvided:gelatoGasPriceTooHigh";
        }

        // 3. Check if condition is whitelisted by provider
        if (!isConditionProvided[_execClaim.provider][_execClaim.condition])
            return "ProviderModuleGnosisSafeProxy.isProvided:ConditionNotProvided";

        return "ok";
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

    function unprovideFunds(uint256 _withdrawAmount)
        public
        override
        returns (uint256 realWithdrawAmount)
    {
        uint256 previousProviderFunds = providerFunds[msg.sender];

        realWithdrawAmount = Math.min(_withdrawAmount, previousProviderFunds);

        uint256 newProviderFunds = previousProviderFunds - realWithdrawAmount;

        // Effects
        providerFunds[msg.sender] = previousProviderFunds - newProviderFunds;

        // Interaction
        msg.sender.sendValue(realWithdrawAmount);

        emit LogUnprovideFunds(msg.sender, previousProviderFunds, newProviderFunds);
    }

    function isProviderLiquid(address _provider)
        public
        view
        override
        returns(bool)
    {
        return minProviderStake <= providerFunds[_provider] ? true : false;
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

    // (Un-)provide Conditions
    function provideCondition(address _condition) public override onlyOwner {
        require(
            !isConditionProvided[msg.sender][_condition],
            "ProviderModuleGnosisSafeProxy.provideCondition: already provided"
        );
        isConditionProvided[msg.sender][_condition] = true;
        emit LogProvideCondition(_condition);
    }

    function unprovideCondition(address _condition) public override onlyOwner {
        require(
            isConditionProvided[msg.sender][_condition],
            "ProviderModuleGnosisSafeProxy.unprovideCondition: already not provided"
        );
        delete isConditionProvided[msg.sender][_condition];
        emit LogUnprovideCondition(_condition);
    }

    // (Un-)provide Actions at different gasPrices
    function provideAction(address _action, uint256 _actionGasPriceCeil) public override onlyOwner {
        // If _actionGasPriceCeil == 0 is passed, set actionGasPriceCeil to actionMaxGasPriceCeil
        if (_actionGasPriceCeil == 0) _actionGasPriceCeil = actionMaxGasPriceCeil;
        actionGasPriceCeil[msg.sender][_action] = _actionGasPriceCeil;
        emit LogProvideAction(_action, _actionGasPriceCeil);
    }

    function unprovideAction(address _action) public override onlyOwner {
        delete actionGasPriceCeil[msg.sender][_action];
        emit LogUnprovideAction(_action);
    }

    // Batch (un-)provide
    function batchProvide(
        address[] memory _conditions,
        address[] memory _actions,
        uint256[] memory _actionGasPriceCeils

    )
        public
        override
        onlyOwner
    {
        for (uint256 i = 0; i < _conditions.length; i++) provideCondition(_conditions[i]);
        for (uint256 i = 0; i < _actions.length; i++) provideAction(_actions[i], _actionGasPriceCeils[i]);
    }

    function batchUnprovide(
        address[] calldata _conditions,
        address[] calldata _actions
    )
        external
        override
        onlyOwner
    {
        for (uint256 i = 0; i < _conditions.length; i++) unprovideCondition(_conditions[i]);
        for (uint256 i = 0; i < _actions.length; i++) unprovideAction(_actions[i]);
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



}