pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import {IGelatoProviderModule} from "./IGelatoProviderModule.sol";
import {ExecClaim} from "../interfaces/IGelatoCore.sol";

interface IGelatoProviders {
    // Registration
    event LogRegisterProvider(address indexed provider);
    event LogUnregisterProvider(address indexed provider);

    // Provider Executor
    event LogAssignProviderExecutor(
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

    // Conditions
    event LogProvideCondition(address indexed provider, address indexed condition);
    event LogUnprovideCondition(address indexed provider, address indexed condition);

    // Actions
    event LogProvideAction(address indexed provider, address indexed action);
    event LogUnprovideAction(address indexed provider, address indexed action);

    // Provider Module
    event LogAddProviderModule(address indexed provider, address indexed module);
    event LogRemoveProviderModule(address indexed provider, address indexed module);


    // =========== CORE PROTOCOL APIs ==============
    // Standard Provider Checks
    function coreProviderChecks(ExecClaim calldata _execClaim) external view returns(bool);

    // Modular Checks via IGelatoProviderModule Standard wrapper
    function providerModuleChecks(ExecClaim calldata _execClaim, uint256 _gelatoGasPrice)
        external
        view
        returns(string memory);

    function combinedProviderChecks(ExecClaim calldata _execClaim, uint256 _gelatoGasPrice)
        external
        view
        returns(string memory);

    // =========== PROVIDER STATE WRITE APIs ==============
    // Provider Funding
    function provideFunds(address _provider) external payable;
    function unprovideFunds(uint256 _withdrawAmount) external;

    // Provider Executor
    function assignProviderExecutor(address _provider, address _executor) external;

    // (Un-)provide Conditions
    function provideCondition(address _condition) external;
    function unprovideCondition(address _condition) external;

    // (Un-)provide Conditions
    function provideAction(address _action) external;
    function unprovideAction(address _action) external;

    // Provider Module
    function addProviderModule(address _module) external;
    function removeProviderModule(address _module) external;

    // Batch (un-)provide
    function batchProvide(
        address _executor,
        address[] calldata _conditions,
        address[] calldata _actions,
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
    function providerFunds(address _provider) external view returns (uint256);

    // Provider Executor
    function providerExecutor(address _provider)
        external
        view
        returns (address);

    // Number of Providers Per Executor
    function executorProvidersCount(address _executor) external view returns(uint256);
    function isExecutorAssigned(address _executor) external view returns(bool);

    // Provider Funding
    function isProviderLiquid(address _provider, uint256 _gas, uint256 _gasPrice)
        external
        view
        returns(bool);

    function isConditionProvided(address _provider, address _condition)
        external
        view
        returns (bool);
    function isActionProvided(address _provider, address _action)
        external
        view
        returns (bool);

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
