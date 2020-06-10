// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import {Action, Operation, DataFlow} from "../gelato_core/interfaces/IGelatoCore.sol";
import {GelatoBytes} from "../libraries/GelatoBytes.sol";
import {IGelatoInFlowAction} from "./action_pipeline_interfaces/IGelatoInFlowAction.sol";
import {IGelatoOutFlowAction} from "./action_pipeline_interfaces/IGelatoOutFlowAction.sol";
import {
    IGelatoInAndOutFlowAction
} from "./action_pipeline_interfaces/IGelatoInAndOutFlowAction.sol";

/// @title GelatoActionPipeline
/// @notice Runtime Environment for executing multiple Actions that can share data
contract GelatoActionPipeline {

    using GelatoBytes for bytes;

    address public immutable thisActionAddress;
    constructor() public { thisActionAddress = address(this); }

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
            require(_actions[i].addr != address(0), "GelatoActionPipeline.noZeroAddress");

            bytes memory actionPayload;

            if (_actions[i].dataFlow == DataFlow.In) {
                actionPayload = abi.encodeWithSelector(
                    IGelatoInFlowAction.execWithDataFlowIn.selector,
                    _actions[i].data,
                    dataFromLastOutFlowAction
                );
            } else if (_actions[i].dataFlow == DataFlow.Out) {
                actionPayload = abi.encodeWithSelector(
                    IGelatoOutFlowAction.execWithDataFlowOut.selector,
                    _actions[i].data
                );
            } else if (_actions[i].dataFlow == DataFlow.InAndOut) {
                actionPayload = abi.encodeWithSelector(
                    IGelatoInAndOutFlowAction.execWithDataFlowInAndOut.selector,
                    _actions[i].data,
                    dataFromLastOutFlowAction
                );
            } else {
                actionPayload = _actions[i].data;
            }

            bool success;
            bytes memory returndata;
            if (_actions[i].operation == Operation.Call){
                (success, returndata) = _actions[i].addr.call{value: _actions[i].value}(
                    actionPayload
                );
            } else {
                (success, returndata) = _actions[i].addr.delegatecall(actionPayload);
            }

            if (!success)
                returndata.revertWithErrorString("GelatoActionPipeline.execActionsAndPipeData:");

            if (
                _actions[i].dataFlow == DataFlow.Out ||
                _actions[i].dataFlow == DataFlow.InAndOut
            ) {
                // All OutFlow actions return (bytes memory). But the low-level
                // delegatecall encoded those bytes into returndata.
                // So we have to decode them again to obtain the original bytes value.
                dataFromLastOutFlowAction = abi.decode(returndata, (bytes));
            }
        }
    }

    function isValid(Action[] calldata _actions)
        external
        pure
        returns (
            bool ok,
            uint256 outActionIndex,
            uint256 inActionIndex,
            bytes32 currentOutflowType,
            bytes32 nextInflowType
        )
    {
        for (uint256 i = 0; i < _actions.length; i++) {
            if (_actions[i].dataFlow == DataFlow.In) {
                // Cannot use DataFlow.In if no Action preceded in the Pipeline
                if (i == 0)
                    return (false, outActionIndex, i, currentOutflowType, nextInflowType);

                // Make sure currentOutflowType matches what the inFlowAction expects
                IGelatoInFlowAction inAction = IGelatoInFlowAction(_actions[i].addr);
                try inAction.DATA_FLOW_IN_TYPE() returns (bytes32 inFlowType) {
                    if (inFlowType == currentOutflowType) ok = true;
                    else return (false, outActionIndex, i, currentOutflowType, inFlowType);
                } catch {
                    revert("GelatoActionPipeline.isValid: error DATA_FLOW_IN_TYPE");
                }

            } else if (_actions[i].dataFlow == DataFlow.Out) {
                // Store this Actions outFlowType to be used by the next inFlowAction
                IGelatoOutFlowAction outAction = IGelatoOutFlowAction(_actions[i].addr);
                try outAction.DATA_FLOW_OUT_TYPE() returns (bytes32 outFlowType) {
                    currentOutflowType = outFlowType;
                    outActionIndex = i;
                } catch {
                    revert("GelatoActionPipeline.isValid: error DATA_FLOW_OUT_TYPE");
                }

            } else if (_actions[i].dataFlow == DataFlow.InAndOut) {
                // Cannot use DataFlow.In if no Action preceded in the Pipeline
                if (i == 0)
                    return (false, outActionIndex, i, currentOutflowType, nextInflowType);

                IGelatoInAndOutFlowAction inAndOutAction = IGelatoInAndOutFlowAction(
                    _actions[i].addr
                );

                // Make sure currentOutflowType matches what the inAndOutAction expects
                try inAndOutAction.DATA_FLOW_IN_TYPE() returns (bytes32 inFlowType) {
                    if (inFlowType == currentOutflowType) ok = true;
                    else return (false, outActionIndex, i, currentOutflowType, inFlowType);
                } catch {
                    revert("GelatoActionPipeline.isValid: error DATA_FLOW_IN_TYPE");
                }

                // Store this Actions outFlowType to be used by the next inFlowAction
                try inAndOutAction.DATA_FLOW_OUT_TYPE() returns (bytes32 outFlowType) {
                    currentOutflowType = outFlowType;
                    outActionIndex = i;
                } catch {
                    revert("GelatoActionPipeline.isValid: error DATA_FLOW_OUT_TYPE");
                }

            } else {
                // if (_actions[i].dataFlow == DataFlow.None)
                continue;
            }
        }
    }
}