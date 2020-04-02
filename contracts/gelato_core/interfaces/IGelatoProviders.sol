pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import {IGelatoProviderModule} from "./IGelatoProviderModule.sol";
import {ExecClaim} from "../interfaces/IGelatoCore.sol";

interface IGelatoProviders {
    // Registration
    event LogRegisterProvider(address indexed provider);
    event LogUnregisterProvider(address indexed provider);

    // Provider Executor
    event LogSetProviderExecutor(
        address indexed provider,
        address indexed oldExecutor,
        address indexed newExecutor
    );

    // Provider Funding
    event LogProvideFunds(
        address indexed provider,
        uint256 previousProviderFunds,
        uint256 newProviderFunds
    );
    event LogUnprovideFunds(
        address indexed provider,
        uint256 previousProviderFunds,
        uint256 newProviderFunds
    );

    // (Un)Providung Condition
    event LogProvideCondition(address indexed condition);
    event LogUnprovideCondition(address indexed condition);

    // (Un)Providung Action
    event LogProvideAction(address indexed action, uint256 indexed _actionGasPriceCeil);
    event LogUnprovideAction(address indexed action);

    // Provider Module
    event LogAddProviderModule(address module);
    event LogRemoveProviderModule(address module);

    // IGelatoProviderModule Standard wrapper
    function providerModuleCheck(
        ExecClaim calldata _execClaim
    )
        external
        view
        returns (string memory);

    function providerCheck (
        ExecClaim calldata _execClaim,
        uint256 _gelatoGasPrice
    )
        external
        view
        returns(string memory);

    // function mintingGate (
    //     ExecClaim calldata _execClaim
    // )
    //     external
    //     view
    //     returns(string memory);

    // Registration
    function registerProvider(address _executor, address[] calldata _modules)
        external
        payable;
    function unregisterProvider(address[] calldata _modules) external;

    // Provider Funding
    function provideFunds(address _provider) external payable;
    function unprovideFunds(uint256 _withdrawAmount) external;

    // Provider Executor
    function assignProviderExecutor(address _provider, address _executor) external;

    // Provider Module
    function addProviderModule(address _module) external;
    function removeProviderModule(address _module) external;
    function batchAddProviderModules(address[] calldata _modules) external;
    function batchRemoveProviderModules(address[] calldata _modules) external;

    // (Un-)provide Conditions
    function provideCondition(address _condition) external;
    function unprovideCondition(address _condition) external;

    // (Un-)provide Actions
    function provideAction(address _action, uint256 _actionGasPriceCeil) external;
    function unprovideAction(address _action) external;

    // Batch (un-)provide
    function batchProvide(
        address[] calldata _conditions,
        address[] calldata _actions,
        uint256[] calldata _actionGasPriceCeils

    )
        external;

    function batchUnprovide(
        address[] calldata _conditions,
        address[] calldata _actions

    )
        external;



    // Provider Funding
    function providerFunds(address _provider) external view returns (uint256);
    function isProviderLiquid(address _provider)
        external
        view
        returns(bool);

    // Provider Executor
    function providerExecutor(address _provider)
        external
        view
        returns (address);

    // Check if condition is whitelisted
    function isConditionProvided(address _provider, address _condition)
        external
        view
        returns (bool);

    // // Check if action is whitelisted
    // function isActionProvided(address _action)
    //     external
    //     view
    //     returns (bool);

    // Check if action is whitelisted
    function actionGasPriceCeil(address _provider, address _action)
        external
        view
        returns (uint256);


    // Number of Providers Per Executor
    function executorProvidersCount(address _executor) external view returns(uint256);
    function isExecutorAssigned(address _executor) external view returns(bool);

    // Providers' Module Getters
    function isProviderModule(address _provider, address _module)
        external
        view
        returns (bool);
    function numOfProviderModules(address _provider)
        external
        view
        returns (uint256);
    function providerModules(address _provider)
        external
        view
        returns (address[] memory);
}
