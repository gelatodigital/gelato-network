pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import {IGelatoProviderModule} from "./IGelatoProviderModule.sol";
import {ExecClaim} from "../interfaces/IGelatoCore.sol";

interface IGelatoProviders {

    struct ActionWithGasPriceCeil { address _address; uint256 gasPriceCeil; }

    // Provider Funding
    event LogProvideFunds(
        address indexed provider,
        uint256 amount,
        uint256 newProviderFunds
    );
    event LogUnprovideFunds(
        address indexed provider,
        uint256 realWithdrawAmount,
        uint256 newProviderFunds
    );

    // Executor By Provider
    event LogProviderAssignsExecutor(
        address indexed provider,
        address indexed oldExecutor,
        address indexed newExecutor
    );
    event LogExecutorAssignsExecutor(
        address indexed provider,
        address indexed oldExecutor,
        address indexed newExecutor
    );

    // Conditions
    event LogProvideCondition(address indexed provider, address indexed condition);
    event LogUnprovideCondition(address indexed provider, address indexed condition);

    // Actions
    event LogProvideAction(
        address indexed provider,
        address indexed action,
        uint256 oldGasPriceCeil,
        uint256 newGasPriceCeil
    );
    event LogUnprovideAction(address indexed provider, address indexed action);

    // Provider Module
    event LogAddProviderModule(address indexed provider, address indexed module);
    event LogRemoveProviderModule(address indexed provider, address indexed module);


    // =========== CORE PROTOCOL APIs ==============
    // GelatoCore: mintExecClaim/canExec/collectExecClaimRent Gate
    function isConditionActionProvided(ExecClaim calldata _execClaim)
        external
        view
        returns(string memory);

    // IGelatoProviderModule: Gelato mintExecClaim/canExec Gate
    function providerModuleChecks(ExecClaim calldata _execClaim)
        external
        view
        returns(string memory);

    function isExecClaimProvided(ExecClaim calldata _execClaim)
        external
        view
        returns(string memory res);

    function providerCanExec(ExecClaim calldata _execClaim, uint256 _gelatoGasPrice)
        external
        view
        returns(string memory res);

    // =========== PROVIDER STATE WRITE APIs ==============
    // Provider Funding
    function provideFunds(address _provider) external payable;
    function unprovideFunds(uint256 _withdrawAmount) external returns(uint256);

    // Provider assigns Executor
    function providerAssignsExecutor(address _executor) external;

    // Executor assigns Executor
    function executorAssignsExecutor(address _provider, address _newExecutor) external;

    // (Un-)provide Conditions
    function provideConditions(address[] calldata _conditions) external;
    function unprovideConditions(address[] calldata _conditions) external;

    // (Un-)provide Conditions
    function provideActions(ActionWithGasPriceCeil[] calldata _actions) external;
    function unprovideActions(address[] calldata _actions) external;

    // Provider Module
    function addProviderModules(address[] calldata _modules) external;
    function removeProviderModules(address[] calldata _modules) external;

    // Batch (un-)provide
    function batchProvide(
        address _executor,
        address[] calldata _conditions,
        ActionWithGasPriceCeil[] calldata _actions,
        address[] calldata _modules
    )
        external
        payable;

    function batchUnprovide(
        uint256 _withdrawAmount,
        address[] calldata _conditions,
        address[] calldata _actions,
        address[] calldata _modules
    )
        external;

    // =========== PROVIDER STATE READ APIs ==============
    // Provider Funding
    function providerFunds(address _provider) external view returns(uint256);
    function isProviderLiquid(address _provider) external view returns(bool);

    // Executor Stake
    function executorStake(address _executor) external view returns(uint256);
    function isExecutorMinStaked(address _executor) external view returns(bool);

    // Provider Executor
    function executorByProvider(address _provider)
        external
        view
        returns(address);

    function executorProvidersCount(address _executor) external view returns(uint256);
    function isExecutorAssigned(address _executor) external view returns(bool);

    function isConditionProvided(address _provider, address _condition)
        external
        view
        returns(bool);
    function actionGasPriceCeil(address _provider, address _action)
        external
        view
        returns(uint256);
    function NO_CEIL() external pure returns(uint256);

    // Providers' Module Getters
    function isProviderModule(address _provider, address _module)
        external
        view
        returns(bool);
    function numOfProviderModules(address _provider)
        external
        view
        returns(uint256);
    function providerModules(address _provider)
        external
        view
        returns(address[] memory);
}
