pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import {ExecClaim} from "../../gelato_core/interfaces/IGelatoCore.sol";
import {IGelatoAction} from "../../gelato_actions/IGelatoAction.sol";

interface IGelatoUserProxy {
    function mintExecClaim(ExecClaim calldata _execClaim) external;

    function mintSelfProvidedExecClaim(ExecClaim calldata _execClaim, address _executor)
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
