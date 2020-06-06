// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;

import {DataFlowType} from "./DataFlowType.sol";

/// @title IGelatoInFlowAction
/// @notice Solidity interface for Actions that make use of DataFlow.InAndOut
interface IGelatoInAndOutFlowAction {
    function execWithDataFlowInAndOut(
        bytes calldata _actionData,
        bytes calldata _inFlowData
    )
        external
        payable
        returns (DataFlowType, bytes memory outFlowData);
}
