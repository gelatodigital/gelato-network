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

    // Provider Module
    event LogAddProviderModule(address module);
    event LogRemoveProviderModule(address module);

    // IGelatoProviderModule Standard wrapper
    function isProvided(
        ExecClaim calldata _execClaim,
        address _executor,
        uint256 _gelatoGasPrice
    )
        external
        view
        returns (string memory);

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

    // Provider Funding
    function providerFunds(address _provider) external view returns (uint256);
    function isProviderLiquid(address _provider, uint256 _gas, uint256 _gasPrice)
        external
        view
        returns(bool);

    // Provider Executor
    function providerExecutor(address _provider)
        external
        view
        returns (address);

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

    // Providers' Claims Getters
    function isProviderClaim(address _provider, bytes32 _execClaimHash)
        external
        view
        returns (bool);
    function numOfProviderClaims(address _provider)
        external
        view
        returns (uint256);
    function providerClaims(address _provider)
        external
        view
        returns (bytes32[] memory);
}
