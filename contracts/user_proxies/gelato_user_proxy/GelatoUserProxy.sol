// SPDX-License-Identifier: MIT
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import {IGelatoUserProxy} from "./interfaces/IGelatoUserProxy.sol";
import {GelatoBytes} from "../../libraries/GelatoBytes.sol";
import {
    Action, Operation, Provider, Task, TaskReceipt, IGelatoCore
} from "../../gelato_core/interfaces/IGelatoCore.sol";

contract GelatoUserProxy is IGelatoUserProxy {

    using GelatoBytes for bytes;

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

    function submitTask(Provider calldata _provider, Task calldata _task, uint256 _expiryDate)
        public
        override
        userOrFactory
    {

        try IGelatoCore(gelatoCore).submitTask(_provider, _task, _expiryDate) {
        } catch Error(string memory err) {
            revert(string(abi.encodePacked("GelatoUserProxy.submitTask:", err)));
        } catch {
            revert("GelatoUserProxy.submitTask:undefinded");
        }
    }

    function multiSubmitTasks(
        Provider calldata _provider,
        Task[] calldata _tasks,
        uint256[] calldata _expiryDates
    )
        external
        override
    {
        require(
            _tasks.length == _expiryDates.length,
            "GelatoUserProxy.multiSubmitTasks: each task needs own expiryDate"
        );
        for (uint i; i < _tasks.length; i++)
            submitTask(_provider, _tasks[i], _expiryDates[i]);
    }

    function submitTaskCycle(
        Provider calldata _provider,
        Task[] calldata _tasks,
        uint256 _expiryDate,
        uint256 _cycles  // num of full cycles
    )
        public
        override
        userOrFactory
    {
        try IGelatoCore(gelatoCore).submitTaskCycle(
            _provider,
            _tasks,
            _expiryDate,
            _cycles
        ) {
        } catch Error(string memory err) {
            revert(string(abi.encodePacked("GelatoUserProxy.submitTaskCycle:", err)));
        } catch {
            revert("GelatoUserProxy.submitTaskCycle:undefinded");
        }
    }

    function submitTaskChain(
        Provider calldata _provider,
        Task[] calldata _tasks,
        uint256 _expiryDate,
        uint256 _sumOfRequestedTaskSubmits  // num of all prospective task submissions
    )
        public
        override
        userOrFactory
    {
        try IGelatoCore(gelatoCore).submitTaskChain(
            _provider,
            _tasks,
            _expiryDate,
            _sumOfRequestedTaskSubmits
        ) {
        } catch Error(string memory err) {
            revert(string(abi.encodePacked("GelatoUserProxy.submitTaskChain:", err)));
        } catch {
            revert("GelatoUserProxy.submitTaskChain:undefinded");
        }
    }

    function cancelTask(TaskReceipt calldata _TR) external override onlyUser {
        try IGelatoCore(gelatoCore).cancelTask(_TR) {
        } catch Error(string memory err) {
            revert(string(abi.encodePacked("GelatoUserProxy.cancelTask:", err)));
        } catch {
            revert("GelatoUserProxy.cancelTask:undefinded");
        }
    }

    function multiCancelTasks(TaskReceipt[] calldata _TRs) external override onlyUser {
        try IGelatoCore(gelatoCore).multiCancelTasks(_TRs) {
        } catch Error(string memory err) {
            revert(string(abi.encodePacked("GelatoUserProxy.multiCancelTasks:", err)));
        } catch {
            revert("GelatoUserProxy.multiCancelTasks:undefinded");
        }
    }

    // @dev we have to write duplicate code due to calldata _action FeatureNotImplemented
    function execAction(Action calldata _action) external payable override auth {
        if (_action.operation == Operation.Call)
            _callAction(_action.addr, _action.data, _action.value);
        else if (_action.operation == Operation.Delegatecall)
            _delegatecallAction(_action.addr, _action.data);
        else
            revert("GelatoUserProxy.execAction: invalid operation");
    }

    // @dev we have to write duplicate code due to calldata _action FeatureNotImplemented
    function multiExecActions(Action[] calldata _actions) public payable override auth {
        for (uint i = 0; i < _actions.length; i++) {
            if (_actions[i].operation == Operation.Call)
                _callAction(_actions[i].addr, _actions[i].data, _actions[i].value);
            else if (_actions[i].operation == Operation.Delegatecall)
                _delegatecallAction(address(_actions[i].addr), _actions[i].data);
            else
                revert("GelatoUserProxy.multiExecActions: invalid operation");
        }
    }

    // @dev we have to write duplicate code due to calldata _action FeatureNotImplemented
    function execActionsAndSubmitTaskCycle(
        Action[] calldata _actions,
        Provider calldata _provider,
        Task[] calldata _tasks,
        uint256 _expiryDate,
        uint256 _cycles
    )
        external
        payable
        override
        auth
    {
        if (_actions.length != 0) multiExecActions(_actions);
        if(_tasks.length != 0) submitTaskCycle(_provider, _tasks, _expiryDate, _cycles);
    }

    function _callAction(address _action, bytes calldata _data, uint256 _value)
        internal
        noZeroAddress(_action)
    {
        (bool success, bytes memory returndata) = _action.call{value: _value}(_data);
        if (!success) returndata.revertWithErrorString("GelatoUserProxy._callAction:");
    }

    function _delegatecallAction(address _action, bytes calldata _data)
        internal
        noZeroAddress(_action)
    {
        (bool success, bytes memory returndata) = _action.delegatecall(_data);
        if (!success) returndata.revertWithErrorString("GelatoUserProxy._delegatecallAction:");
    }
}