pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { IGelatoProviderModule } from "./IGelatoProviderModule.sol";
import { IGelatoCondition } from "../../gelato_conditions/IGelatoCondition.sol";

struct Provider {
    address addr;  //  if msg.sender == provider => self-Provider
    IGelatoProviderModule module;  //  can be IGelatoProviderModule(0) for self-Providers
}

struct Condition {
    IGelatoCondition inst;  // can be AddressZero for self-conditional Actions
    bytes data;  // can be bytes32(0) for self-conditional Actions
}

enum Operation { Call, Delegatecall }

struct Action {
    address addr;
    bytes data;
    Operation operation;
    uint256 value;
    bool termsOkCheck;
}

struct Task {
    Provider provider;
    Condition[] conditions;  // optional
    Action[] actions;
    uint256 expiryDate;  // 0 == infinity.
}

struct TaskReceipt {
    uint256 id;
    address userProxy;
    Task task;
}

interface IGelatoCore {
    event LogTaskSubmitted(
        address indexed executor,
        uint256 indexed taskReceiptId,
        bytes32 indexed taskReceiptHash,
        TaskReceipt taskReceipt
    );

    event LogExecSuccess(
        address indexed executor,
        uint256 indexed taskReceiptId,
        uint256 executorSuccessFee,
        uint256 sysAdminSuccessFee
    );
    event LogCanExecFailed(
        address indexed executor,
        uint256 indexed taskReceiptId,
        string reason
    );
    event LogExecFailed(
        address indexed executor,
        uint256 indexed taskReceiptId,
        uint256 executorRefund,
        string reason
    );
    event LogExecutionReverted(
        address indexed executor,
        uint256 indexed taskReceiptId,
        uint256 executorRefund
    );

    event LogTaskCancelled(uint256 indexed taskReceiptId);

    function canSubmitTask(address _executor, address _userProxy, Task calldata _task)
        external
        view
        returns(string memory);

    /// @notice Submit a gelato task that will be executed under the specified conditions
    /// @dev This function must be called from a contract account provided by Provider
    /// @param _task Selected provider, conditions, actions, expiry date of the task
    function submitTask(Task calldata _task) external;

    /// @notice Submit a gelato task that will be executed under the specified conditions
    /// @dev This function must be called from a contract account provided by Provider
    /// @param _tasks Selected provider, conditions, actions, expiry date of the task
    function multiSubmitTasks(Task[] calldata _tasks) external;


    // ================  Exec Suite =========================
    /// @notice Off-chain API for executors to check, if a TaskReceipt is executable
    /// @dev GelatoCore checks this during execution, in order to safeguard the Conditions
    /// @param _TR TaskReceipt, consisting of user task, user proxy address and id
    /// @param _gelatoMaxGas If  this is used by an Executor and a revert happens,
    ///  the Executor gets a refund from the Provider and the TaskReceipt is annulated.
    /// @param _execTxGasPrice Must be used by Executors. Gas Price fed by gelatoCore's
    ///  Gas Price Oracle. Executors can query the current gelatoGasPrice from events.
    function canExec(TaskReceipt calldata _TR, uint256 _gelatoMaxGas, uint256 _execTxGasPrice)
        external
        view
        returns(string memory);

    /// @notice Executors call this when Conditions allow it to execute submitted Tasks.
    /// @dev Executors get rewarded for successful Execution. The Task remains open until
    ///   successfully executed, or when the execution failed, despite of gelatoMaxGas usage.
    ///   In the latter case Executors are refunded by the Task Provider.
    /// @param _TR TaskReceipt: id, userProxy, Task.
    function exec(TaskReceipt calldata _TR) external;

    /// @notice Cancel task
    /// @dev Callable only by userProxy or selected provider
    /// @param _TR TaskReceipt: id, userProxy, Task.
    function cancelTask(TaskReceipt calldata _TR) external;

    /// @notice Batch Cancel tasks
    /// @dev Callable only by userProxy or selected provider
    /// @param _taskReceipts TaskReceipts: id, userProxy, Task.
    function multiCancelTasks(TaskReceipt[] calldata _taskReceipts) external;

    /// @notice Compute hash of task receipt
    /// @param _TR TaskReceipt, consisting of user task, user proxy address and id
    /// @return hash of taskReceipt
    function hashTaskReceipt(TaskReceipt calldata _TR) external pure returns(bytes32);

    // ================  Getters =========================
    /// @notice Returns the taskReceiptId of the last TaskReceipt submitted
    /// @return currentId currentId, last TaskReceiptId submitted
    function currentTaskReceiptId() external view returns(uint256 currentId);

    /// @notice Returns computed taskReceipt hash, used to check for taskReceipt validity
    /// @param _taskReceiptId Id of taskReceipt emitted in submission event
    /// @return hash of taskReceipt
    function taskReceiptHash(uint256 _taskReceiptId) external view returns(bytes32);

}
