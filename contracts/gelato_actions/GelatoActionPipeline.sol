// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import {Action, Operation, DataFlow} from "../gelato_core/interfaces/IGelatoCore.sol";
import {GelatoDebug} from "../libraries/GelatoDebug.sol";
import {IGelatoInFlowAction} from "./action_pipeline_interfaces/IGelatoInFlowAction.sol";
import {IGelatoOutFlowAction} from "./action_pipeline_interfaces/IGelatoOutFlowAction.sol";
import {
    IGelatoInAndOutFlowAction
} from "./action_pipeline_interfaces/IGelatoInAndOutFlowAction.sol";

/// @title GelatoActionPipeline
/// @notice Runtime Environment for executing multiple Actions that can share data
contract GelatoActionPipeline {

    using GelatoDebug for bytes;

    address public immutable thisActionAddress;

    constructor() public { thisActionAddress = address(this); }

    modifier noZeroAddress(address _) {
        require(_ != address(0), "GelatoActionPipeline.noZeroAddress");
        _;
    }

    /// @notice This code can be delegatecalled by User Proxies during the execution
    ///  of multiple Actions, in order to let data flow between them, in
    ///  accordance with their Action.DataFlow specifications.
    /// @dev ProviderModules should encode their execPayload with this function selector.
    /// @param _actions List of _actions to be executed sequentially in pipeline
    function execActionsAndPipeData(Action[] calldata _actions) external {
        require(thisActionAddress != address(this), "GelatoActionPipeline.delegatecallOnly");

        // Store for reusable data from Actions that DataFlow.Out or DataFlow.InAndOut
        bytes memory dataFromLastOutFlowAction;

        // We execute Actions sequentially and store reusable outflowing Data
        for (uint i = 0; i < _actions.length; i++) {
            if (_actions[i].dataFlow == DataFlow.In) {
                _execActionWithDataFlowIn(_actions[i], dataFromLastOutFlowAction);

            } else if (_actions[i].dataFlow == DataFlow.Out) {
                dataFromLastOutFlowAction = _execActionWithDataFlowOut(_actions[i]);

            } else if (_actions[i].dataFlow == DataFlow.InAndOut) {
                dataFromLastOutFlowAction = _execActionWithDataFlowInAndOut(
                    _actions[i],
                    dataFromLastOutFlowAction
                );

            } else {
                // _actions[i].dataFlow == DataFlow.None
                _execAction(_actions[i]);
            }
        }
    }

    function _execAction(Action calldata _action) internal {
        if (_action.operation == Operation.Call)
            _callAction(_action.addr, _action.data, _action.value);
        else _delegatecallAction(_action.addr, _action.data);
    }

    function _execActionWithDataFlowIn(
        Action calldata _action,
        bytes memory _inFlowData
    )
        internal
        virtual
    {
        bytes memory actionPayload = abi.encodeWithSelector(
            IGelatoInFlowAction.execWithDataFlowIn.selector,
            _action.data,
            _inFlowData
        );
        if (_action.operation == Operation.Call)
            _callAction(_action.addr, actionPayload, _action.value);
        else _delegatecallAction(_action.addr, actionPayload);
    }

    function _execActionWithDataFlowOut(Action calldata _action)
        internal
        virtual
        returns (bytes memory outFlowData)
    {
        bytes memory actionPayload = abi.encodeWithSelector(
            IGelatoOutFlowAction.execWithDataFlowOut.selector,
            _action.data
        );
        if (_action.operation == Operation.Call)
            outFlowData = _callActionAndReturnData(_action.addr, actionPayload, _action.value);
        else outFlowData = _delegatecallActionAndReturnData(_action.addr, actionPayload);
    }

    function _execActionWithDataFlowInAndOut(
        Action calldata _action,
        bytes memory _inFlowData
    )
        internal
        virtual
        returns (bytes memory outFlowData)
    {
        bytes memory actionPayload = abi.encodeWithSelector(
            IGelatoInAndOutFlowAction.execWithDataFlowInAndOut.selector,
            _action.data,
            _inFlowData
        );
        if (_action.operation == Operation.Call)
            outFlowData = _callActionAndReturnData(_action.addr, actionPayload, _action.value);
        else outFlowData = _delegatecallActionAndReturnData(_action.addr, actionPayload);
    }

    function _callAction(address _action, bytes memory _data, uint256 _value)
        internal
        virtual
        noZeroAddress(_action)
    {
        (bool success, bytes memory returndata) = _action.call{value: _value}(_data);
        if (!success)
            returndata.revertWithErrorString("GelatoActionPipeline._callAction:");
    }

    function _callActionAndReturnData(address _action, bytes memory _data, uint256 _value)
        internal
        virtual
        noZeroAddress(_action)
        returns (bytes memory returndata)
    {
        bool success;
        (success, returndata) = _action.call{value: _value}(_data);
        if (!success) {
            returndata.revertWithErrorString(
                "GelatoActionPipeline._callActionAndReturnData:"
            );
        }
    }

    function _delegatecallAction(address _action, bytes memory _data)
        internal
        virtual
        noZeroAddress(_action)
    {
        (bool success, bytes memory returndata) = _action.delegatecall(_data);
        if (!success)
            returndata.revertWithErrorString("GelatoActionPipeline._delegatecallAction:");
    }

    function _delegatecallActionAndReturnData(address _action, bytes memory _data)
        internal
        virtual
        noZeroAddress(_action)
        returns (bytes memory returndata)
    {
        bool success;
        (success, returndata) = _action.delegatecall(_data);
        if (!success) {
            returndata.revertWithErrorString(
                "GelatoActionPipeline._delegatecallActionAndReturnData:"
            );
        }
    }
}