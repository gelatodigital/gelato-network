// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;

/// @title IGelatoOutFlowAction
/// @notice Solidity interface for Actions that make use of DataFlow.Out
/// @dev Inherit this, if you want implement your Action.DataFlow.Out in a standard way.
interface IGelatoOutFlowAction {
    /// @notice Executes the Action implementation with data flowing out to consecutive
    ///  Actions in a GelatoActionPipeline.
    /// @dev The outFlowData format should be defined by DATA_FLOW_OUT_TYPE
    /// @param _actionData Known prior to execution and probably encoded off-chain.
    /// @return outFlowData The bytes encoded data this action implementation emits.
    function execWithDataFlowOut(bytes calldata _actionData)
        external
        payable
        returns (bytes memory outFlowData);

    /// @notice Returns the expected format of the execWithDataFlowOut outFlowData.
    /// @dev Strict adherence to these formats is crucial for GelatoActionPipelines.
    function DATA_FLOW_OUT_TYPE() external pure returns (bytes32);
}
