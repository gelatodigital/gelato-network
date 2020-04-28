pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { IGelatoProviderModule } from "./IGelatoProviderModule.sol";
import { Action, Task, TaskReceipt } from "../interfaces/IGelatoCore.sol";
import { IGelatoCondition } from "../../gelato_conditions/IGelatoCondition.sol";

// TaskSpec - Will be whitelised by providers and selected by users
struct TaskSpec {
    IGelatoCondition[] conditions;   // Address: optional AddressZero for self-conditional actions
    Action[] actions;
    uint256 gasPriceCeil;
}

interface IGelatoProviders {
    // Provider Funding
    event LogFundsProvided(
        address indexed provider,
        uint256 amount,
        uint256 newProviderFunds
    );
    event LogFundsUnprovided(
        address indexed provider,
        uint256 realWithdrawAmount,
        uint256 newProviderFunds
    );

    // Executor By Provider
    event LogProviderAssignedExecutor(
        address indexed provider,
        address indexed oldExecutor,
        address indexed newExecutor
    );
    event LogExecutorAssignedExecutor(
        address indexed provider,
        address indexed oldExecutor,
        address indexed newExecutor
    );

    // Actions
    event LogTaskSpecProvided(address indexed provider, bytes32 indexed taskSpecHash);
    event LogTaskSpecUnprovided(address indexed provider, bytes32 indexed taskSpecHash);
    event LogTaskSpecGasPriceCeilSet(
        address indexed provider,
        bytes32 taskSpecHash,
        uint256 oldTaskSpecGasPriceCeil,
        uint256 newTaskSpecGasPriceCeil
    );

    // Provider Module
    event LogProviderModuleAdded(
        address indexed provider,
        IGelatoProviderModule indexed module
    );
    event LogProviderModuleRemoved(
        address indexed provider,
        IGelatoProviderModule indexed module
    );

    // =========== GELATO PROVIDER APIs ==============

    /// @notice Validation that checks whether Task Spec is being offered by the selected provider
    /// @dev Checked in submitTask(), unless provider == userProxy
    /// @param _provider Address of selected provider
    /// @param _taskSpec Task Spec
    /// @return Expected to return "OK"
    function isTaskSpecProvided(address _provider, TaskSpec calldata _taskSpec)
        external
        view
        returns(string memory);

    /// @notice Validates that provider has provider module whitelisted + conducts isProvided check in ProviderModule
    /// @dev Checked in submitTask() if provider == userProxy
    /// @param _userProxy userProxy passed by GelatoCore during submission and exec
    /// @param _task Task defined in IGelatoCore
    /// @return Expected to return "OK"
    function providerModuleChecks(address _userProxy, Task calldata _task)
        external
        view
        returns(string memory);


    /// @notice Validate if provider module and seleced TaskSpec is whitelisted by provider
    /// @dev Combines "isTaskSpecProvided" and providerModuleChecks
    /// @param _userProxy userProxy passed by GelatoCore during submission and exec
    /// @param _task Task defined in IGelatoCore
    /// @return res Expected to return "OK"
    function isTaskProvided(address _userProxy, Task calldata _task)
        external
        view
        returns(string memory res);


    /// @notice Validate if selected TaskSpec is whitelisted by provider and that current gelatoGasPrice is below GasPriceCeil
    /// @dev If gasPriceCeil is != 0, Task Spec is whitelisted
    /// @param _TR Task Receipt defined in IGelatoCore
    /// @param _gelatoGasPrice Task Receipt defined in IGelatoCore
    /// @return res Expected to return "OK"
    function providerCanExec(TaskReceipt calldata _TR, uint256 _gelatoGasPrice)
        external
        view
        returns(string memory res);

    // =========== PROVIDER STATE WRITE APIs ==============
    // Provider Funding
    /// @notice Deposit ETH as provider on Gelato
    /// @param _provider Address of provider who receives ETH deposit
    function provideFunds(address _provider) external payable;

    /// @notice Withdraw provider funds from gelato
    /// @param _withdrawAmount Amount
    /// @return amount that will be withdrawn
    function unprovideFunds(uint256 _withdrawAmount) external returns(uint256);

    /// @notice Assign executor as provider
    /// @param _executor Address of new executor
    function providerAssignsExecutor(address _executor) external;

    /// @notice Assign executor as previous selected executor
    /// @param _provider Address of provider whose executor to change
    /// @param _newExecutor Address of new executor
    function executorAssignsExecutor(address _provider, address _newExecutor) external;

    // (Un-)provide Task Spec

    /// @notice Whitelist TaskSpecs (A combination of a Condition, Action(s) and a gasPriceCeil) that users can select from
    /// @dev If gasPriceCeil is == 0, Task Spec will be executed at any gas price (no ceil)
    /// @param _taskSpecs Task Receipt List defined in IGelatoCore
    function provideTaskSpecs(TaskSpec[] calldata _taskSpecs) external;

    /// @notice De-whitelist TaskSpecs (A combination of a Condition, Action(s) and a gasPriceCeil) that users can select from
    /// @dev If gasPriceCeil was set to NO_CEIL, Input NO_CEIL constant as GasPriceCeil
    /// @param _taskSpecs Task Receipt List defined in IGelatoCore
    function unprovideTaskSpecs(TaskSpec[] calldata _taskSpecs) external;

    /// @notice Update gasPriceCeil of selected Task Spec
    /// @param _taskSpecHash Result of hashTaskSpec()
    /// @param _gasPriceCeil New gas price ceil for Task Spec
    function setTaskSpecGasPriceCeil(bytes32 _taskSpecHash, uint256 _gasPriceCeil) external;

    // Provider Module
    /// @notice Whitelist new provider Module(s)
    /// @param _modules Addresses of the modules which will be called during providerModuleChecks()
    function addProviderModules(IGelatoProviderModule[] calldata _modules) external;

    /// @notice De-Whitelist new provider Module(s)
    /// @param _modules Addresses of the modules which will be removed
    function removeProviderModules(IGelatoProviderModule[] calldata _modules) external;

    // Batch (un-)provide

    /// @notice Whitelist new executor, TaskSpec(s) and Module(s) in one tx
    /// @param _executor Address of new executor of provider
    /// @param _taskSpecs List of Task Spec which will be whitelisted by provider
    /// @param _modules List of module addresses which will be whitelisted by provider
    function multiProvide(
        address _executor,
        TaskSpec[] calldata _taskSpecs,
        IGelatoProviderModule[] calldata _modules
    )
        external
        payable;


    /// @notice De-Whitelist TaskSpec(s), Module(s) and withdraw funds from gelato in one tx
    /// @param _withdrawAmount Amount to withdraw from ProviderFunds
    /// @param _taskSpecs List of Task Spec which will be de-whitelisted by provider
    /// @param _modules List of module addresses which will be de-whitelisted by provider
    function multiUnprovide(
        uint256 _withdrawAmount,
        TaskSpec[] calldata _taskSpecs,
        IGelatoProviderModule[] calldata _modules
    )
        external;

    // =========== PROVIDER STATE READ APIs ==============
    // Provider Funding

    /// @notice Get balance of provider
    /// @param _provider Address of provider
    /// @return Provider Balance
    function providerFunds(address _provider) external view returns(uint256);

    /// @notice Get min stake required by all providers for executors to call exec
    /// @param _gelatoMaxGas Current gelatoMaxGas
    /// @param _gelatoGasPrice Current gelatoGasPrice
    /// @return How much provider balance is required for executor to submit exec tx
    function minExecProviderFunds(uint256 _gelatoMaxGas, uint256 _gelatoGasPrice)
        external
        view
        returns(uint256);

    /// @notice Check if provider has sufficient funds for executor to call exec
    /// @param _provider Address of provider
    /// @param _gelatoMaxGas Currentt gelatoMaxGas
    /// @param _gelatoGasPrice Current gelatoGasPrice
    /// @return Whether provider is liquid (true) or not (false)
    function isProviderLiquid(
        address _provider,
        uint256 _gelatoMaxGas,
        uint256 _gelatoGasPrice
    )
        external
        view
        returns(bool);

    // Executor Stake

    /// @notice Get balance of executor
    /// @param _executor Address of executor
    /// @return Executor Balance
    function executorStake(address _executor) external view returns(uint256);

    /// @notice Check if executor has sufficient stake on gelato
    /// @param _executor Address of provider
    /// @return Whether executor has sufficient stake (true) or not (false)
    function isExecutorMinStaked(address _executor) external view returns(bool);

    /// @notice Get executor of provider
    /// @param _provider Address of provider
    /// @return Provider's executor
    function executorByProvider(address _provider)
        external
        view
        returns(address);

    /// @notice Get num. of providers which haved assigned an executor
    /// @param _executor Address of executor
    /// @return Count of how many providers assigned the executor
    function executorProvidersCount(address _executor) external view returns(uint256);

    /// @notice Check if executor has one or more providers assigned
    /// @param _executor Address of provider
    /// @return Where 1 or more providers have assigned the executor
    function isExecutorAssigned(address _executor) external view returns(bool);

    // Task Spec and Gas Price Ceil
    /// @notice The maximum gas price the transaction will be executed with
    /// @param _provider Address of provider
    /// @param _taskSpecHash Hash of provider TaskSpec
    /// @return Max gas price an executor will execute the transaction with in wei
    function taskSpecGasPriceCeil(address _provider, bytes32 _taskSpecHash)
        external
        view
        returns(uint256);

    /// @notice Compute an TaskSpecHash
    /// @dev action.data will be striped before hashing
    /// @param _taskSpec TaskSpec
    /// @return keccak256 hash of encoded condition address and Action List
    function hashTaskSpec(TaskSpec calldata _taskSpec) external view returns(bytes32);

    /// @notice Constant used to specify the highest gas price available in the gelato system
    /// @dev Input 0 as gasPriceCeil and it will be assigned to NO_CEIL
    /// @return MAX_UINT
    function NO_CEIL() external pure returns(uint256);

    // Providers' Module Getters

    /// @notice Check if inputted module is whitelisted by provider
    /// @param _provider Address of provider
    /// @param _module Address of module
    /// @return true if it is whitelisted
    function isModuleProvided(address _provider, IGelatoProviderModule _module)
        external
        view
        returns(bool);

    /// @notice Get all whitelisted provider modules from a given provider
    /// @param _provider Address of provider
    /// @return List of whitelisted provider modules
    function providerModules(address _provider)
        external
        view
        returns(IGelatoProviderModule[] memory);
}
