pragma solidity ^0.6.0;

import {IGelatoAction} from "../../gelato_actions/IGelatoAction.sol";

interface IGelatoUserProxy {
    function callAccount(address, bytes calldata)
        external
        payable
        returns (bool, bytes memory);
    function delegatecallAccount(address, bytes calldata)
        external
        payable
        returns (bool, bytes memory);

    function callGelatoAction(IGelatoAction _action, bytes calldata _actionPayload)
        external
        payable;

    function delegatecallGelatoAction(address _action, bytes calldata _actionPayload)
        external
        payable;

    function user() external view returns (address);
    function gelatoCore() external view returns (address);
}
