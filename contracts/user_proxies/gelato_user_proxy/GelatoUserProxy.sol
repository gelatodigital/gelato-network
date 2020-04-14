pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { IGelatoUserProxy } from "./IGelatoUserProxy.sol";
import { Action, Operation, Task, IGelatoCore } from "../../gelato_core/interfaces/IGelatoCore.sol";
import { IGelatoAction } from "../../gelato_actions/IGelatoAction.sol";

contract GelatoUserProxy is IGelatoUserProxy {
    address public override user;
    address public override gelatoCore;

    modifier noZeroAddress(address _) {
        require(_ != address(0), "GelatoUserProxy.noZeroAddress");
        _;
    }

    modifier onlyUser() {
        require(msg.sender == user, "GelatoUserProxy.onlyUser: failed");
        _;
    }

    modifier auth() {
        require(
            msg.sender == user || msg.sender == gelatoCore,
            "GelatoUserProxy.auth: failed"
        );
        _;
    }

    constructor(address _user, address _gelatoCore)
        public
        payable
        noZeroAddress(_user)
        noZeroAddress(_gelatoCore)
    {
        user = _user;
        gelatoCore = _gelatoCore;
    }

    fallback() external payable {}

    function mintExecClaim(Task calldata _task) external override onlyUser {
        IGelatoCore(gelatoCore).mintExecClaim(_task);
    }

    function mintSelfProvidedExecClaim(Task calldata _task, address _executor)
        external
        payable
        override
        onlyUser
    {
        IGelatoCore(gelatoCore).mintSelfProvidedExecClaim{value: msg.value}(_task, _executor);
    }

    // @dev we have to write duplicate code due to calldata _action FeatureNotImplemented
    function execGelatoAction(Action calldata _action)
        external
        payable
        override
        auth
    {
        if (_action.operation == Operation.Call)
            callAction(address(_action.inst), _action.data);
        else if (_action.operation == Operation.Delegatecall)
            delegatecallAction(address(_action.inst), _action.data);
        else
            revert("GelatoUserProxy.execGelatoAction: invalid operation");
    }

    // @dev we have to write duplicate code due to calldata _action FeatureNotImplemented
    function multiExecGelatoActions(Action[] calldata _actions)
        external
        payable
        override
        auth
    {
        for (uint i = 0; i < _actions.length; i++) {
            if (_actions[i].operation == Operation.Call)
                callAction(address(_actions[i].inst), _actions[i].data);
            else if (_actions[i].operation == Operation.Delegatecall)
                delegatecallAction(address(_actions[i].inst), _actions[i].data);
            else
                revert("GelatoUserProxy.multiExecGelatoActions: invalid operation");
        }
    }

    function callAction(address _action, bytes memory _data)
        public
        payable
        override
        auth
        noZeroAddress(_action)
    {
        (bool success, bytes memory err) = _action.call{value: msg.value}(_data);
        if (!success) {
            // FAILURE
            // 68: 32-location, 32-length, 4-ErrorSelector, UTF-8 err
            if (err.length % 32 == 4) {
                bytes4 selector;
                assembly { selector := mload(add(0x20, err)) }
                if (selector == 0x08c379a0) {  // Function selector for Error(string)
                    assembly { err := add(err, 68) }
                    revert(string(abi.encodePacked(
                        "GelatoUserProxy.callAction:",
                        string(err)
                    )));
                } else {
                    revert("GelatoUserProxy.callAction:NoErrorSelector");
                }
            } else {
                revert("GelatoUserProxy.callAction:UnexpectedReturndata");
            }
        }
    }

    function multiCallActions(address[] calldata _actions, bytes[] calldata _data)
        external
        payable
        override
        auth
    {
        for (uint i = 0; i < _actions.length; i++) callAction(_actions[i], _data[i]);
    }

    function delegatecallAction(address _action, bytes memory _data)
        public
        payable
        override
        auth
        noZeroAddress(_action)
    {
        (bool success, bytes memory err) = _action.delegatecall(_data);
        if (!success) {
            // FAILURE
            // 68: 32-location, 32-length, 4-ErrorSelector, UTF-8 err
            if (err.length % 32 == 4) {
                bytes4 selector;
                assembly { selector := mload(add(0x20, err)) }
                if (selector == 0x08c379a0) {  // Function selector for Error(string)
                    assembly { err := add(err, 68) }
                    revert(string(abi.encodePacked(
                        "GelatoUserProxy.delegatecallAction:",
                        string(err)
                    )));
                } else {
                    revert("GelatoUserProxy.delegatecallAction:NoErrorSelector");
                }
            } else {
                revert("GelatoUserProxy.delegatecallAction:UnexpectedReturndata");
            }
        }
    }

    function multiDelegatecallActions(address[] calldata _actions, bytes[] calldata _data)
        external
        payable
        override
        auth
    {
        for (uint i = 0; i < _actions.length; i++) delegatecallAction(_actions[i], _data[i]);
    }
}