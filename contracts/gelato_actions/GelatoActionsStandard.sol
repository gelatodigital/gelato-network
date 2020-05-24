// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;

import "./IGelatoAction.sol";

/// @title GelatoActionsStandard
/// @dev find all the NatSpecs inside IGelatoAction
abstract contract GelatoActionsStandard is IGelatoAction {

    string internal constant OK = "OK";

    function termsOk(
        uint256,  // _taskReceiptId
        address,  // _userProxy
        bytes calldata,  // _actionData
        uint256  // _value: for actions that send ETH around
    )
        external
        view
        override
        virtual
        returns(string memory)  // actionTermsOk
    {
        // Standard return value for actionConditions fulfilled and no erros:
        return OK;
    }
}
