pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { IGelatoUserProxy } from "./interfaces/IGelatoUserProxy.sol";
import { GelatoDebug } from "../../libraries/GelatoDebug.sol";
import {
    Action, Operation, Provider, Task, TaskReceipt, IGelatoCore
} from "../../gelato_core/interfaces/IGelatoCore.sol";

contract GelatoUserProxy is IGelatoUserProxy {


    using GelatoDebug for bytes;

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

    function submitTask(Provider memory _provider, Task memory _task, uint256 _expiryDate)
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
        Provider[] memory _providers,
        Task[] memory _tasks,
        uint256[] memory _expiryDates
    )
        public
        override
    {
        if (_providers.length == 0 || _tasks.length == 0)
            revert("GelatoUserProxy.multiSubmitTasks: 0 providers or tasks");

        bool singleProvider = _providers.length == 1;
        if (!singleProvider && _tasks.length != _providers.length)
            revert("GelatoUserProxy.multiSubmitTasks: providers <!> tasks");

        bool singleExpiry = _expiryDates.length == 1 || _expiryDates.length == 0;
        if (!singleExpiry && _tasks.length != _expiryDates.length)
            revert("GelatoUserProxy.multiSubmitTasks: tasks <!> expiries");

        for (uint i; i < _tasks.length; i++) {
            submitTask(
                singleProvider ? _providers[0] : _providers[i],
                _tasks[i],
                singleExpiry ? _getSingleExpiryDate(_expiryDates) : _expiryDates[i]
            );
        }
    }

    function _getSingleExpiryDate(uint256[] memory _expiryDates)
        private
        pure
        returns(uint256)
    {
        if (_expiryDates.length == 0) return 0;
        else return _expiryDates[0];
    }

    function submitTaskCycle(
        Provider memory _provider,
        Task[] memory _tasks,
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
        Provider memory _provider,
        Task[] memory _tasks,
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
        public
        override
        noZeroAddress(_action)
    {
        (bool success, bytes memory returndata) = _action.call{value: _value}(_data);
        if (!success) returndata.revertWithErrorString("GelatoUserProxy.callAction:");
    }

    function delegatecallAction(address _action, bytes memory _data)
        public
        override
        noZeroAddress(_action)
    {
        (bool success, bytes memory returndata) = _action.delegatecall(_data);
        if (!success) returndata.revertWithErrorString("GelatoUserProxy.delegatecallAction:");
    }
}