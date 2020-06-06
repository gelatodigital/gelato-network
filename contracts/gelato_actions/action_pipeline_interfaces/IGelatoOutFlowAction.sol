// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;

import {DataFlowType} from "./DataFlowType.sol";

/// @title IGelatoInFlowAction
/// @notice Solidity interface for Actions that make use of DataFlow.Out
/// @dev Inherit this, if you want implement your Action.DataFlow.Out in a standard way.
interface IGelatoOutFlowAction {
    function execWithDataFlowOut(bytes calldata _actionData)
        external
        payable
        returns (DataFlowType, bytes memory outFlowData);
}
