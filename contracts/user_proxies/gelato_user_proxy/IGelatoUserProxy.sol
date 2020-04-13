pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { Action, Task } from "../../gelato_core/interfaces/IGelatoCore.sol";

interface IGelatoUserProxy {
    function mintExecClaim(Task calldata _task) external;

    function mintSelfProvidedExecClaim(Task calldata _task, address _executor)
        external
        payable;

    function callAction(Action calldata _action) external payable;
    function multiCallActions(Action[] calldata _actions) external payable;

    function callGelatoAction(Action calldata _action) external payable;
    function multiCallGelatoActions(Action[] calldata _actions) external payable;

    function delegatecallAction(Action calldata _action) external payable;
    function multiDelegatecallActions(Action[] calldata _actions) external payable;

    function user() external view returns (address);
    function gelatoCore() external view returns (address);
}
