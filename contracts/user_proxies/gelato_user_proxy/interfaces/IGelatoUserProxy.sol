pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { Action, Task } from "../../../gelato_core/interfaces/IGelatoCore.sol";

struct ActionWithValue {
    address inst;
    bytes data;
    uint256 value;
}

struct ActionWithData {
    address inst;
    bytes data;
}

interface IGelatoUserProxy {
    function mintExecClaim(Task calldata _task) external;

    function execGelatoAction(Action calldata _action) external;
    function multiExecGelatoActions(Action[] calldata _actions) external;

    function callAction(address _action, bytes calldata _data, uint256 _value)
        external
        payable;
    function multiCallActions(ActionWithValue[] calldata _actions)
        external
        payable;

    function delegatecallAction(address _action, bytes calldata _data) external payable;
    function multiDelegatecallActions(ActionWithData[] calldata _actions)
        external
        payable;

    function user() external view returns(address);
    function gelatoCore() external view returns(address);
}
