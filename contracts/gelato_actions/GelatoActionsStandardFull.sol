// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;

import {GelatoActionsStandard} from "./GelatoActionsStandard.sol";
import {IGelatoInFlowAction} from "./action_pipeline_interfaces/IGelatoInFlowAction.sol";
import {IGelatoOutFlowAction} from "./action_pipeline_interfaces/IGelatoOutFlowAction.sol";
import {
    IGelatoInAndOutFlowAction
} from "./action_pipeline_interfaces/IGelatoInAndOutFlowAction.sol";

/// @title GelatoActionsStandardFull
/// @notice ActionStandard that inherits from all the PipeAction interfaces.
/// @dev Inherit this to enforce implementation of all PipeAction functions.
abstract contract GelatoActionsStandardFull is
    GelatoActionsStandard,
    IGelatoInFlowAction,
    IGelatoOutFlowAction,
    IGelatoInAndOutFlowAction
{}