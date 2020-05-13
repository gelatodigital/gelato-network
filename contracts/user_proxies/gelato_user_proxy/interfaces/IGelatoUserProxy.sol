pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { Action, Task, TaskReceipt } from "../../../gelato_core/interfaces/IGelatoCore.sol";

interface IGelatoUserProxy {

    /// @notice API to submit a single Task.
    /// @dev You can let users submit multiple tasks at once by batching calls to this.
    /// @param _task A Gelato Task object: provider, conditions, actions.
    /// @param _expiryDate From then on the task cannot be executed. 0 for infinity.
    function submitTask(Task calldata _task, uint256 _expiryDate) external;

    /// @notice API to submit multiple "single" Tasks.
    /// @dev CAUTION: The ordering of _tasks and their _expiryDates must be coordinated.
    /// @param _tasks An array of Gelato Task objects: provider, conditions, actions.
    /// @param _expiryDates From then on the task cannot be executed. 0 for infinity.
    function multiSubmitTasks(Task[] calldata _tasks, uint256[] calldata _expiryDates)
        external;

    /// @notice A Gelato Task Cycle consists of 1 or more Tasks that automatically submit
    ///  the next one, after they have been executed.
    /// @param _tasks This can be a single task or a sequence of tasks.
    /// @param _cycles How many full cycles will be submitted
    /// @param _expiryDate  After this no task of the sequence can be executed any more.
    function submitTaskCycle(
        Task[] calldata _tasks,
        uint256 _cycles,
        uint256 _expiryDate
    )
        external;

    /// @notice A Gelato Task Cycle consists of 1 or more Tasks that automatically submit
    ///  the next one, after they have been executed.
    /// @dev CAUTION: _sumOfRequestedTaskSubmits does not mean the number of cycles.
    /// @param _tasks This can be a single task or a sequence of tasks.
    /// @param _sumOfRequestedTaskSubmits The TOTAL number of Task auto-submits
    //   that should have occured once the cycle is complete:
    ///  1) _sumOfRequestedTaskSubmits=X: number of times to run the same task or the sum
    ///   of total cyclic task executions in the case of a sequence of different tasks.
    ///  2) _submissionsLeft=0: infinity - run the same task or sequence of tasks infinitely.
    /// @param _expiryDate  After this no task of the sequence can be executed any more.
    function submitTaskChain(
        Task[] calldata _tasks,
        uint256 _sumOfRequestedTaskSubmits,  // does NOT mean the number of cycles
        uint256 _expiryDate
    ) external;

    /// @notice Cancel a task receipt on gelato
    /// @dev Proxy users or the Task providers can cancel.
    /// @param _TR Task Receipt to cancel
    function cancelTask(TaskReceipt calldata _TR) external;

    /// @notice Cancel Tasks with their receipts on gelato
    /// @dev Proxy users or the Task providers can cancel.
    /// @param _TRs Task Receipts of Tasks to cancel
    function multiCancelTasks(TaskReceipt[] calldata _TRs) external;

    /// @notice Execute an action
    /// @param _action Action to execute
    function execAction(Action calldata _action) external payable;

    /// @notice Execute multiple actions
    /// @param _actions Actions to execute
    function multiExecActions(Action[] calldata _actions) external payable;

    function callAction(address _action, bytes calldata _data, uint256 _value) external;
    function delegatecallAction(address _action, bytes calldata _data) external;

    /// @notice Get the factory address whence the proxy was created.
    /// @return Address of proxy's factory
    function factory() external pure returns(address);

    /// @notice Get the owner (EOA) address of the proxy
    /// @return Address of proxy owner
    function user() external pure returns(address);

    /// @notice Get the address of gelato
    /// @return Address of gelato
    function gelatoCore() external pure returns(address);
}
