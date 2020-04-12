pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { Action, Task } from "../../gelato_core/interfaces/IGelatoCore.sol";
import { IGelatoAction } from "../../gelato_actions/IGelatoAction.sol";

interface IGelatoUserProxy {
    function mintExecClaim(Task calldata _task) external;

    function mintSelfProvidedExecClaim(Task calldata _task, address _executor)
        external
        payable;

    function callGelatoAction(
        IGelatoAction _action,
        bytes calldata _actionPayload
    ) external payable;

    function callAction(address, bytes calldata)
        external
        payable;

    function delegatecallAction(address, bytes calldata)
        external
        payable;

    function user() external view returns (address);
    function gelatoCore() external view returns (address);

    function multiCallAction(address[] calldata _accounts, bytes[] calldata _payloads)
        external;

    function multiDelegatecallAction(Action[] calldata _actions) external;

    function multiGelatoCallAction(IGelatoAction[] calldata _accounts, bytes[] calldata _payloads)
        external;


}
