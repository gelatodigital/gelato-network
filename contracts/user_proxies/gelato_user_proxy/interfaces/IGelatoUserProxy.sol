// SPDX-License-Identifier: MIT
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import {
    Action, Provider, Task, TaskReceipt
} from "../../../gelato_core/interfaces/IGelatoCore.sol";

interface IGelatoUserProxy {

    /// @notice API to submit a single Task.
    /// @dev You can let users submit multiple tasks at once by batching calls to this.
    /// @param _provider Gelato Provider object: provider address and module.
    /// @param _task A Gelato Task object: provider, conditions, actions.
    /// @param _expiryDate From then on the task cannot be executed. 0 for infinity.
    function submitTask(Provider calldata _provider, Task calldata _task, uint256 _expiryDate)
        external;

    /// @notice API to submit multiple "single" Tasks.
    /// @dev CAUTION: The ordering of _tasks<=>_expiryDates must be coordinated.
    /// @param _providers Gelato Provider object: provider address and module.
    /// @param _tasks An array of Gelato Task objects: provider, conditions, actions.
    /// @param _expiryDates From then on the task cannot be executed. 0 for infinity.
    function multiSubmitTasks(
        Provider calldata _providers,
        Task[] calldata _tasks,
        uint256[] calldata _expiryDates
    )
        external;

    /// @notice A Gelato Task Cycle consists of 1 or more Tasks that automatically submit
    ///  the next one, after they have been executed.
    /// @param _tasks This can be a single task or a sequence of tasks.
    /// @param _provider Gelato Provider object: provider address and module.
    /// @param _expiryDate  After this no task of the sequence can be executed any more.
    /// @param _cycles How many full cycles will be submitted
    function submitTaskCycle(
        Provider calldata _provider,
        Task[] calldata _tasks,
        uint256 _expiryDate,
        uint256 _cycles
    )
        external;

    /// @notice A Gelato Task Cycle consists of 1 or more Tasks that automatically submit
    ///  the next one, after they have been executed.
    /// @dev CAUTION: _sumOfRequestedTaskSubmits does not mean the number of cycles.
    /// @param _provider Gelato Provider object: provider address and module.
    /// @param _tasks This can be a single task or a sequence of tasks.
    /// @param _expiryDate  After this no task of the sequence can be executed any more.
    /// @param _sumOfRequestedTaskSubmits The TOTAL number of Task auto-submits
    //   that should have occured once the cycle is complete:
    ///  1) _sumOfRequestedTaskSubmits=X: number of times to run the same task or the sum
    ///   of total cyclic task executions in the case of a sequence of different tasks.
    ///  2) _submissionsLeft=0: infinity - run the same task or sequence of tasks infinitely.
    function submitTaskChain(
        Provider calldata _provider,
        Task[] calldata _tasks,
        uint256 _expiryDate,
        uint256 _sumOfRequestedTaskSubmits
    ) external;


    /// @notice Execs actions and submits task cycle in one tx
    /// @param _actions Actions to execute
    /// @param _provider Gelato Provider object: provider address and module.
    /// @param _tasks This can be a single task or a sequence of tasks.
    /// @param _expiryDate  After this no task of the sequence can be executed any more.
    /// @param _cycles How many full cycles will be submitted
    function execActionsAndSubmitTaskCycle(
        Action[] calldata _actions,
        Provider calldata _provider,
        Task[] calldata _tasks,
        uint256 _expiryDate,
        uint256 _cycles
    )
        external
        payable;

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
