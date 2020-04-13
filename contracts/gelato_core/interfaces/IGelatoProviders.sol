pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { IGelatoProviderModule } from "./IGelatoProviderModule.sol";
import { ExecClaim} from "../interfaces/IGelatoCore.sol";

interface IGelatoProviders {

    // CAM
    struct ConditionActionsMix {
        address condition;   // optional AddressZero for self-conditional actions
        address[] actions;
        uint256 gasPriceCeil;  // GPC
    }

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

    // Actions
    event LogProvideCAM(
        address indexed provider,
        bytes32 indexed camHash,
        uint256 oldGasPriceCeil,
        uint256 newGasPriceCeil
    );
    event LogUnprovideCAM(address indexed provider, bytes32 indexed camHash);

    // Provider Module
    event LogAddProviderModule(
        address indexed provider,
        IGelatoProviderModule indexed module
    );
    event LogRemoveProviderModule(
        address indexed provider,
        IGelatoProviderModule indexed module
    );

    // =========== CORE PROTOCOL APIs ==============
    // GelatoCore: mintExecClaim/canExec/collectExecClaimRent Gate
    function isCAMProvided(ExecClaim calldata _ec) external view returns(string memory);

    // IGelatoProviderModule: Gelato mintExecClaim/canExec Gate
    function providerModuleChecks(ExecClaim calldata _ec)
        external
        view
        returns(string memory);

    function isExecClaimProvided(ExecClaim calldata _ec)
        external
        view
        returns(string memory res);

    function providerCanExec(ExecClaim calldata _ec, uint256 _gelatoGasPrice)
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
    function provideCAMs(ConditionActionsMix[] calldata _actions) external;
    function unprovideCAMs(ConditionActionsMix[] calldata _actionsArray) external;

    // Provider Module
    function addProviderModules(IGelatoProviderModule[] calldata _modules) external;
    function removeProviderModules(IGelatoProviderModule[] calldata _modules) external;

    // Batch (un-)provide
    function batchProvide(
        address _executor,
        ConditionActionsMix[] calldata _actions,
        IGelatoProviderModule[] calldata _modules
    )
        external
        payable;

    function batchUnprovide(
        uint256 _withdrawAmount,
        ConditionActionsMix[] calldata _actions,
        IGelatoProviderModule[] calldata _modules
    )
        external;

    // =========== PROVIDER STATE READ APIs ==============
    // Provider Funding
    function providerFunds(address _provider) external view returns(uint256);
    function isProviderMinStaked(address _provider) external view returns(bool);

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

    // Condition Actions Mix and Gas Price Ceil
    function camGPC(address _provider, bytes32 _camHash)
        external
        view
        returns(uint256);
    function camHash(ConditionActionsMix calldata _cam) external view returns(bytes32);
    function NO_CEIL() external pure returns(uint256);

    // Providers' Module Getters
    function isProviderModule(address _provider, IGelatoProviderModule _module)
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
        returns(IGelatoProviderModule[] memory);
}
