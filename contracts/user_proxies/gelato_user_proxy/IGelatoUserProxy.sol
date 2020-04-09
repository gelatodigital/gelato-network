pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { Task } from "../../gelato_core/interfaces/IGelatoCore.sol";
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

    function delegatecallGelatoAction(
        address _action,
        bytes calldata _actionPayload
    ) external payable;

    function callAccount(address, bytes calldata)
        external
        payable
        returns (bool, bytes memory);
    function delegatecallAccount(address, bytes calldata)
        external
        payable
        returns (bool, bytes memory);

    function user() external view returns (address);
    function gelatoCore() external view returns (address);
}
