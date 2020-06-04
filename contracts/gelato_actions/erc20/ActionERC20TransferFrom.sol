// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;
pragma experimental ABIEncoderV2;

import { GelatoActionsStandard } from "../GelatoActionsStandard.sol";
import { IERC20 } from "../../external/IERC20.sol";
import { SafeERC20 } from "../../external/SafeERC20.sol";
import { Address } from "../../external/Address.sol";

contract ActionERC20TransferFrom is GelatoActionsStandard {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using Address for address;
    using SafeERC20 for IERC20;

    /// @dev Use this function for encoding off-chain
    function action(
        address user,
        IERC20 sendToken,
        address destination,
        uint256 sendAmount,
        bool /*returnsTaskState*/
    )
        public
        payable
        virtual
    {
        sendToken.safeTransferFrom(user, destination, sendAmount);
        emit LogOneWay(user, address(sendToken), sendAmount, destination);
    }

    // Will be automatically called by gelato => do not use for encoding
    function gelatoInternal(bytes calldata _actionData, bytes calldata _taskState)
        external
        virtual
        override
        returns(ReturnType returnType, bytes memory returnValue)
    {
        // 1. Decode Payload, if no taskState was present
        (address user,
         IERC20 sendToken,
         address destination,
         uint256 sendAmount,
         bool returnsTaskState) = abi.decode(
            _actionData[4:],
            (address, IERC20, address, uint256, bool)
        );

        // 2. Check if taskState exists
        if (_taskState.length != 0) {
            (ReturnType returnType, bytes memory _numBytes) = abi.decode(
                _taskState,
                (ReturnType, bytes)
            );
            if (returnType == ReturnType.UINT)
                sendAmount = abi.decode(_numBytes, (uint256));
            else if (returnType == ReturnType.UINT_AND_ERC20)
                (sendAmount, sendToken) = abi.decode(_numBytes, (uint256, IERC20));
        }

        // 3. Call action
        action(user, sendToken, destination, sendAmount, returnsTaskState);

        // 4. Handle Task State Return Values
        if (returnsTaskState) {
            returnType = ReturnType.UINT;
            returnValue = abi.encodePacked(sendAmount);
        } else {
            returnType = ReturnType.NONE;
        }
    }

    // ======= ACTION CONDITIONS CHECK =========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(uint256, address _userProxy, bytes calldata _actionData, uint256)
        external
        view
        override
        virtual
        returns(string memory)  // actionTermsOk
    {
        (address user, IERC20 sendToken, , uint256 sendAmount,) = abi.decode(
            _actionData[4:],
            (address, IERC20, address, uint256, bool)
        );
        return termsOk(_userProxy, user, sendToken, sendAmount);
    }

    function termsOk(address _userProxy, address user, IERC20 sendToken, uint256 sendAmount)
        public
        view
        virtual
        returns(string memory)
    {
        try sendToken.balanceOf(user) returns(uint256 sendTokenBalance) {
            if (sendTokenBalance < sendAmount)
                return "ActionERC20TransferFrom: NotOkUserSendTokenBalance";
        } catch {
            return "ActionERC20TransferFrom: ErrorBalanceOf";
        }

        try sendToken.allowance(user, _userProxy) returns(uint256 allowance) {
            if (allowance < sendAmount)
                return "ActionERC20TransferFrom: NotOkUserProxySendTokenAllowance";
        } catch {
            return "ActionERC20TransferFrom: ErrorAllowance";
        }

        return OK;
    }
}
