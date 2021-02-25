// SPDX-License-Identifier: MIT
pragma solidity ^0.6.10;

/// @title IGelatoInFlowAction
/// @notice Solidity interface for Actions that make use of DataFlow.In
/// @dev Inherit this, if you want your Action to use DataFlow.In in a standard way.
interface IGelatoInFlowAction {
    /// @notice Executes the action implementation with data flowing in from a previous
    ///  Action in the sequence.
    /// @dev The _inFlowData format should be defined by DATA_FLOW_IN_TYPE
    /// @param _actionData Known prior to execution and probably encoded off-chain.
    /// @param _inFlowData Not known prior to execution. Passed in via GelatoActionPipeline.
    function execWithDataFlowIn(bytes calldata _actionData, bytes calldata _inFlowData)
        external
        payable;

    /// @notice Returns the expected format of the execWithDataFlowIn _inFlowData.
    /// @dev Strict adherence to these formats is crucial for GelatoActionPipelines.
    function DATA_FLOW_IN_TYPE() external pure returns (bytes32);
}
