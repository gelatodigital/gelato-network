pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { IGelatoProviderModule } from "./IGelatoProviderModule.sol";
import { Action, ExecClaim } from "../interfaces/IGelatoCore.sol";
import { IGelatoCondition } from "../../gelato_conditions/IGelatoCondition.sol";

interface IGelatoProviders {

    // CAM
    struct ConditionActionsMix {
        IGelatoCondition condition;   // optional AddressZero for self-conditional actions
        Action[] actions;
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
    event LogProvideCAM(address indexed provider, bytes32 indexed camHash);
    event LogUnprovideCAM(address indexed provider, bytes32 indexed camHash);
    event LogSetCAMGPC(
        address indexed provider,
        bytes32 camHash,
        uint256 oldCAMGPC,
        uint256 newCAMGPC
    );

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
    function isCAMProvided(
        address _provider,
        IGelatoCondition _condition,
        Action[] calldata _actions
    )
        external
        view
        returns(string memory);

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
    function setCAMGPC(bytes32 _camHash, uint256 _gasPriceCeil) external;

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
    function minExecProviderFunds(uint256 _gelatoMaxGas, uint256 _gelatoGasPrice)
        external
        view
        returns(uint256);
    function isProviderLiquid(
        address _provider,
        uint256 _gelatoMaxGas,
        uint256 _gelatoGasPrice
    )
        external
        view
        returns(bool);

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
    function camHash(IGelatoCondition _condition, Action[] calldata _noDataActions)
        external
        view
        returns(bytes32);
    function NO_CEIL() external pure returns(uint256);

    // Providers' Module Getters
    function isModuleProvided(address _provider, IGelatoProviderModule _module)
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
