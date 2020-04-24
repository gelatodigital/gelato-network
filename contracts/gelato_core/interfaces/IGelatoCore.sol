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
    address inst;
    bytes data;
    Operation operation;
    uint256 value;
    bool termsOkCheck;
}

struct Task {  //
    Provider provider;
    Condition condition;  // optional
    Action[] actions;
    uint256 expiryDate;  // subject to rent payments; 0 == infinity.
}

struct TaskReceipt {  // TaskReceipt
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

    // ================  Exec Suite =========================
    /// @notice Submit a gelato task that will be executed if the specified condition and action(s) terms are fulfilled
    /// @dev Use only through a Proxy contract which is defined in the selected provider module
    /// @param _task Seleted provider, condition and action details, plus the expiry date after which the task is rendered useless
    function submitTask(Task calldata _task) external;

    /// @notice Off-chain validation for executors to see if an task receipt is executable
    /// @dev Only used for off-chain validation
    /// @param _TR TaskReceipt, consisting of user task, user proxy address and id
    /// @param _gelatoMaxGas Gas Limit to send to exec by executor to receive a full refund even if tx reverts
    /// @param _execTxGasPrice Gas Price of gelatoCore's gas price oracle
    function canExec(TaskReceipt calldata _TR, uint256 _gelatoMaxGas, uint256 _execTxGasPrice)
        external
        view
        returns(string memory);

    /// @notice Executes the users task after conducting all condition and actions(s) term(s) checks
    /// @dev Executor gets refunded, even if the specified action(s) revert
    /// @param _TR TaskReceipt, consisting of user task, user proxy address and id
    function exec(TaskReceipt calldata _TR) external;

    /// @notice Cancel task
    /// @dev Callable only by userProxy or selected provider
    /// @param _TR TaskReceipt, consisting of user task, user proxy address and id
    function cancelTask(TaskReceipt calldata _TR) external;

    /// @notice Batch Cancel tasks
    /// @dev Callable only by userProxy or selected provider
    /// @param _taskReceipts TaskReceipt Array, consisting of user task, user proxy address and id
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
