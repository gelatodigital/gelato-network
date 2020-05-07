pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { IGelatoUserProxy } from "./interfaces/IGelatoUserProxy.sol";
import {
    Action, Operation, Task, TaskReceipt, IGelatoCore
} from "../../gelato_core/interfaces/IGelatoCore.sol";

contract GelatoUserProxy is IGelatoUserProxy {

    address public immutable override factory;
    address public immutable override user;
    address public immutable override gelatoCore;

    constructor(address _user, address _gelatoCore)
        public
        payable
        noZeroAddress(_user)
        noZeroAddress(_gelatoCore)
    {
        factory = msg.sender;
        user = _user;
        gelatoCore = _gelatoCore;
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

    modifier userOrFactory() {
        require(
            msg.sender == user || msg.sender == factory,
            "GelatoUserProxy.userOrFactory: failed");
        _;
    }

    modifier auth() {
        require(
            msg.sender == gelatoCore || msg.sender == user || msg.sender == factory,
            "GelatoUserProxy.auth: failed"
        );
        _;
    }

    function submitTask(Task memory _task) public override userOrFactory {
        try IGelatoCore(gelatoCore).submitTask(_task) {
        } catch Error(string memory err) {
            revert(string(abi.encodePacked("GelatoUserProxy.submitTask:", err)));
        } catch {
            revert("GelatoUserProxy.submitTask:undefinded");
        }
    }

    function multiSubmitTasks(Task[] memory _tasks) public override userOrFactory {
        for (uint i; i < _tasks.length; i++) submitTask(_tasks[i]);
    }

    function submitTaskCycle(Task[] memory _tasks) public override userOrFactory {
        try IGelatoCore(gelatoCore).submitTaskCycle(_tasks) {
        } catch Error(string memory err) {
            revert(string(abi.encodePacked("GelatoUserProxy.submitTaskCycle:", err)));
        } catch {
            revert("GelatoUserProxy.submitTaskCycle:undefinded");
        }
    }

    function cancelTask(TaskReceipt memory _TR) public override onlyUser {
        try IGelatoCore(gelatoCore).cancelTask(_TR) {
        } catch Error(string memory err) {
            revert(string(abi.encodePacked("GelatoUserProxy.cancelTask:", err)));
        } catch {
            revert("GelatoUserProxy.cancelTask:undefinded");
        }
    }

    function multiCancelTasks(TaskReceipt[] memory _TRs) public override onlyUser {
        try IGelatoCore(gelatoCore).multiCancelTasks(_TRs) {
        } catch Error(string memory err) {
            revert(string(abi.encodePacked("GelatoUserProxy.multiCancelTasks:", err)));
        } catch {
            revert("GelatoUserProxy.multiCancelTasks:undefinded");
        }
    }

    // @dev we have to write duplicate code due to calldata _action FeatureNotImplemented
    function execAction(Action memory _action) public payable override auth {
        if (_action.operation == Operation.Call)
            callAction(_action.addr, _action.data, _action.value);
        else if (_action.operation == Operation.Delegatecall)
            delegatecallAction(_action.addr, _action.data);
        else
            revert("GelatoUserProxy.execAction: invalid operation");
    }

    // @dev we have to write duplicate code due to calldata _action FeatureNotImplemented
    function multiExecActions(Action[] memory _actions) public payable override auth {
        for (uint i = 0; i < _actions.length; i++) {
            if (_actions[i].operation == Operation.Call)
                callAction(_actions[i].addr, _actions[i].data, _actions[i].value);
            else if (_actions[i].operation == Operation.Delegatecall)
                delegatecallAction(address(_actions[i].addr), _actions[i].data);
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
                    revert(
                        string(abi.encodePacked("GelatoUserProxy.callAction:", string(err)))
                    );
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
                    revert(
                        string(
                            abi.encodePacked("GelatoUserProxy.delegatecallAction:", string(err))
                        )
                    );
                } else {
                    revert("GelatoUserProxy.delegatecallAction:NoErrorSelector");
                }
            } else {
                revert("GelatoUserProxy.delegatecallAction:UnexpectedReturndata");
            }
        }
    }
}