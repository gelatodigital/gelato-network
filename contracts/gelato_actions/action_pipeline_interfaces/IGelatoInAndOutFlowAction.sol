// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;

import {Action} from "../../gelato_core/interfaces/IGelatoCore.sol";

/// @title IGelatoInAndOutFlowAction
/// @notice Solidity interface for Actions that make use of DataFlow.InAndOut
interface IGelatoInAndOutFlowAction {

    /// @notice Executes the Action implementation with data flowing in from a previous
    ///  Action in the GelatoActionPipeline and with data flowing out to consecutive
    ///  Actions in the pipeline.
    /// @dev The _inFlowData format should be defined by DATA_FLOW_IN_TYPE and
    ///  the outFlowData format should be defined by DATA_FLOW_OUT_TYPE.
    /// @param _actionData Known prior to execution and probably encoded off-chain.
    /// @param _inFlowData Not known prior to execution. Passed in via GelatoActionPipeline.
    /// @return outFlowData The bytes encoded data this action implementation emits.
    function execWithDataFlowInAndOut(
        bytes calldata _actionData,
        bytes calldata _inFlowData
    )
        external
        payable
        returns (bytes memory outFlowData);

    /// @notice Returns the expected format of the execWithDataFlowIn _inFlowData.
    /// @dev Strict adherence to these formats is crucial for GelatoActionPipelines.
    function DATA_FLOW_IN_TYPE() external pure returns (bytes32);

    /// @notice Returns the expected format of the execWithDataFlowOut outFlowData.
    /// @dev Strict adherence to these formats is crucial for GelatoActionPipelines.
    function DATA_FLOW_OUT_TYPE() external pure returns (bytes32);
}