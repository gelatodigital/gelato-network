// SPDX-License-Identifier: MIT
pragma solidity ^0.6.10;

import {DataFlow} from "../gelato_core/interfaces/IGelatoCore.sol";

/// @title IGelatoAction - solidity interface of GelatoActionsStandard
/// @notice all the APIs and events of GelatoActionsStandard
/// @dev all the APIs are implemented inside GelatoActionsStandard
interface IGelatoAction {
    event LogOneWay(
        address origin,
        address sendToken,
        uint256 sendAmount,
        address destination
    );

    event LogTwoWay(
        address origin,
        address sendToken,
        uint256 sendAmount,
        address destination,
        address receiveToken,
        uint256 receiveAmount,
        address receiver
    );

    /// @notice Providers can use this for pre-execution sanity checks, to prevent reverts.
    /// @dev GelatoCore checks this in canExec and passes the parameters.
    /// @param _taskReceiptId The id of the task from which all arguments are passed.
    /// @param _userProxy The userProxy of the task. Often address(this) for delegatecalls.
    /// @param _actionData The encoded payload to be used in the Action.
    /// @param _dataFlow The dataFlow of the Action.
    /// @param _value A special param for ETH sending Actions. If the Action sends ETH
    ///  in its Action function implementation, one should expect msg.value therein to be
    ///  equal to _value. So Providers can check in termsOk that a valid ETH value will
    ///  be used because they also have access to the same value when encoding the
    ///  execPayload on their ProviderModule.
    /// @param _cycleId For tasks that are part of a Cycle.
    /// @return Returns OK, if Task can be executed safely according to the Provider's
    ///  terms laid out in this function implementation.
    function termsOk(
        uint256 _taskReceiptId,
        address _userProxy,
        bytes calldata _actionData,
        DataFlow _dataFlow,
        uint256 _value,
        uint256 _cycleId
    )
        external
        view
        returns(string memory);
}
