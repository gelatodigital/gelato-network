// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

/// @title IGelatoCondition - solidity interface of GelatoConditionsStandard
/// @notice all the APIs of GelatoConditionsStandard
/// @dev all the APIs are implemented inside GelatoConditionsStandard
interface IGelatoCondition {

    ///@notice GelatoCore calls this to verify securely the specified Condition securely
    ///@dev Be careful only to encode a Task's condition.data as is and not with the
    ///  "ok" selector or _taskReceiptId, since those two things are handled by GelatoCore.
    /// @param _taskReceiptId This is passed by GelatoCore so we can rely on it as a secure
    ///  source of Task identification.
    /// @param _conditionData This is the Condition.data field developers must encode their
    ///  Condition's specific parameters in.
    function ok(uint256 _taskReceiptId, bytes calldata _conditionData)
        external
        view
        returns(string memory);

    function okStandardSelector() external pure returns(bytes4);
}