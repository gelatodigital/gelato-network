pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { Action, Task } from "../../../gelato_core/interfaces/IGelatoCore.sol";

interface IGelatoUserProxy {
    function mintExecClaim(Task calldata _task) external;

    function mintSelfProvidedExecClaim(Task calldata _task, address _executor)
        external
        payable;

    function execGelatoAction(Action calldata _actions) external payable;
    function multiExecGelatoActions(Action[] calldata _actions) external payable;

    function callAction(address _action, bytes calldata _data) external payable;
    function multiCallActions(address[] calldata _actions, bytes[] calldata _data)
        external
        payable;

    function delegatecallAction(address _action, bytes calldata _data) external payable;
    function multiDelegatecallActions(address[] calldata _actions, bytes[] calldata _data)
        external
        payable;

    function user() external view returns (address);
    function gelatoCore() external view returns (address);
}
