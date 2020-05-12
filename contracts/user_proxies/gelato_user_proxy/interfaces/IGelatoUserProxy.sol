pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { Action, Task, TaskReceipt } from "../../../gelato_core/interfaces/IGelatoCore.sol";

interface IGelatoUserProxy {

    /// @notice Submit a task on gelato
    /// @param _task Task to create
    function submitTask(Task calldata _task, uint256 _exipiryDate, uint256 _rounds) external;

    /// @notice Submit multiple tasks on gelato
    /// @param _tasks Tasks to submit
    function multiSubmitTasks(Task[] calldata _tasks, uint256[] calldata _exipiryDate, uint256[] calldata _rounds) external;

    /// @notice Submit multiple tasks on gelato
    /// @param _tasks Cyclic Task sequence to enter into.
    function submitTaskCycle(Task[] calldata _tasks, uint256 _exipiryDate, uint256 _rounds) external;

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
