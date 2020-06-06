// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;

/// @title IGelatoInFlowAction
/// @notice Solidity interface for Actions that make use of DataFlow.In
/// @dev Inherit this, if you want your Action to use DataFlow.In in a standard way.
interface IGelatoInFlowAction {
    function execWithDataFlowIn(bytes calldata _actionData, bytes calldata _inFlowData)
        external
        payable;
}
