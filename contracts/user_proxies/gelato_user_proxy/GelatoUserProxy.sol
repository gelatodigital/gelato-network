pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { IGelatoUserProxy } from "./interfaces/IGelatoUserProxy.sol";
import {
    Action, Operation, Task, ExecClaim, IGelatoCore
} from "../../gelato_core/interfaces/IGelatoCore.sol";

contract GelatoUserProxy is IGelatoUserProxy {

    address public override user;
    address public override gelatoCore;

    constructor(
        address _user,
        address _gelatoCore,
        Task[] memory _optionalMintTasks,
        Action[] memory _optionalActions
    )
        public
        payable
        noZeroAddress(_user)
        noZeroAddress(_gelatoCore)
    {

        user = _user;
        gelatoCore = _gelatoCore;
        _initialize(_gelatoCore, _optionalMintTasks, _optionalActions);
    }

    receive() external payable {}

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
            msg.sender == gelatoCore || msg.sender == user,
            "GelatoUserProxy.auth: failed"
        );
        _;
    }

    function mintExecClaim(Task memory _task) public override onlyUser {
        try IGelatoCore(gelatoCore).mintExecClaim(_task) {
        } catch Error(string memory err) {
            revert(string(abi.encodePacked("GelatoUserProxy.mintExecClaim:", err)));
        } catch {
            revert("GelatoUserProxy.mintExecClaim:undefinded");
        }
    }

    function multiMintExecClaims(Task[] memory _tasks) public override onlyUser {
        for (uint i = 0; i < _tasks.length; i++) mintExecClaim(_tasks[i]);
    }

    function cancelExecClaim(ExecClaim memory _ec) public override onlyUser {
        try IGelatoCore(gelatoCore).cancelExecClaim(_ec) {
        } catch Error(string memory err) {
            revert(string(abi.encodePacked("GelatoUserProxy.cancelExecClaim:", err)));
        } catch {
            revert("GelatoUserProxy.cancelExecClaim:undefinded");
        }
    }

    function batchCancelExecClaims(ExecClaim[] memory _ecs) public override onlyUser {
        try IGelatoCore(gelatoCore).batchCancelExecClaims(_ecs) {
        } catch Error(string memory err) {
            revert(string(abi.encodePacked("GelatoUserProxy.batchCancelExecClaims:", err)));
        } catch {
            revert("GelatoUserProxy.batchCancelExecClaims:undefinded");
        }
    }

    // @dev we have to write duplicate code due to calldata _action FeatureNotImplemented
    function execAction(Action memory _action) public payable override auth {
        if (_action.operation == Operation.Call)
            callAction(_action.inst, _action.data, _action.value);
        else if (_action.operation == Operation.Delegatecall)
            delegatecallAction(_action.inst, _action.data);
        else
            revert("GelatoUserProxy.execAction: invalid operation");
    }

    // @dev we have to write duplicate code due to calldata _action FeatureNotImplemented
    function multiExecActions(Action[] memory _actions) public payable override auth {
        for (uint i = 0; i < _actions.length; i++) {
            if (_actions[i].operation == Operation.Call)
                callAction(_actions[i].inst, _actions[i].data, _actions[i].value);
            else if (_actions[i].operation == Operation.Delegatecall)
                delegatecallAction(address(_actions[i].inst), _actions[i].data);
            else
                revert("GelatoUserProxy.multiExecActions: invalid operation");
        }
    }

    function callAction(address _action, bytes memory _data, uint256 _value)
        private
        noZeroAddress(_action)
    {
        (bool success, bytes memory err) = _action.call{value: _value}(_data);
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

    function delegatecallAction(address _action, bytes memory _data)
        private
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

    function _initialize(
        address _gelatoCore,
        Task[] memory _tasks,
        Action[] memory _actions
    )
        private
    {
        if (_tasks.length != 0) {
            for (uint i = 0; i < _tasks.length; i++) {
                try IGelatoCore(_gelatoCore).mintExecClaim(_tasks[i]) {
                } catch Error(string memory err) {
                    revert(
                        string(
                            abi.encodePacked(
                                "GelatoUserProxy._initialize.mintExecClaim:", err
                            )
                        )
                    );
                } catch {
                    revert("GelatoUserProxy._initialize.mintExecClaim:undefined");
                }
            }
        }

        if (_actions.length != 0) {
            for (uint i = 0; i < _actions.length; i++) {
                if (_actions[i].operation == Operation.Call)
                    callAction(_actions[i].inst, _actions[i].data, _actions[i].value);
                else if (_actions[i].operation == Operation.Delegatecall)
                    delegatecallAction(address(_actions[i].inst), _actions[i].data);
                else
                    revert("GelatoUserProxy._initialize: invalid operation");
            }
        }
    }
}