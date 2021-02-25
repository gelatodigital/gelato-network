// SPDX-License-Identifier: MIT
pragma solidity ^0.6.10;

import {IGelatoAction} from "./IGelatoAction.sol";
import {DataFlow} from "../gelato_core/interfaces/IGelatoCore.sol";

/// @title GelatoActionsStandard
/// @dev find all the NatSpecs inside IGelatoAction
abstract contract GelatoActionsStandard is IGelatoAction {

    string internal constant OK = "OK";
    address internal constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    address public immutable thisActionAddress;

    constructor() public { thisActionAddress = address(this); }

    modifier delegatecallOnly(string memory _tracingInfo) {
        require(
            thisActionAddress != address(this),
            string(abi.encodePacked(_tracingInfo, ":delegatecallOnly"))
        );
        _;
    }

    function termsOk(
        uint256,  // _taskReceiptId
        address,  // _userProxy
        bytes calldata,  // _actionData
        DataFlow,
        uint256,  // _value: for actions that send ETH around
        uint256  // cycleId
    )
        external
        view
        virtual
        override
        returns(string memory)  // actionTermsOk
    {
        // Standard return value for actionConditions fulfilled and no erros:
        return OK;
    }
}
