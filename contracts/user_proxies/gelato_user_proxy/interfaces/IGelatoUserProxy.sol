pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { Action, Task, ExecClaim } from "../../../gelato_core/interfaces/IGelatoCore.sol";

interface IGelatoUserProxy {

    /// @notice Submit a task on gelato
    /// @param _task Task to create
    function submitTask(Task calldata _task) external;

    /// @notice Submit multiple tasks on gelato
    /// @param _tasks Task to create
    function multiSubmitTasks(Task[] calldata _tasks) external;

    /// @notice Cancel an execution claim on gelato
    /// @param _ec Execution Claim to cancel
    function cancelExecClaim(ExecClaim calldata _ec) external;

    /// @notice Cancel multiple execution claims on gelato
    /// @param _ecs Execution Claims to cancel
    function batchCancelExecClaims(ExecClaim[] calldata _ecs) external;

    /// @notice Execute an action
    /// @param _action Action to execute
    function execAction(Action calldata _action) external payable;

    /// @notice Execute multiple actions
    /// @param _actions Actions to execute
    function multiExecActions(Action[] calldata _actions) external payable;

    /// @notice Get the owner (EOA) address of the proxy
    /// @return Address of proxy owner
    function user() external pure returns(address);

    /// @notice Get the address of gelato
    /// @return Address of gelato
    function gelatoCore() external pure returns(address);
}
