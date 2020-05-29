// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;
pragma experimental ABIEncoderV2;

import { GelatoActionsStandard } from "../GelatoActionsStandard.sol";
import { IERC20 } from "../../external/IERC20.sol";
import { Address } from "../../external/Address.sol";

/// @dev This action does not abide by GelatoActionsStandard because
///      this action is for user proxies that store funds.
contract ActionTransfer is GelatoActionsStandard {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using Address for address payable;

    function action(
        address sendToken,
        uint256 sendAmount,
        address payable destination,
        bool
    )
        public
        payable
        virtual
    {
        if (sendToken != ETH_ADDRESS) {
            IERC20 sendERC20 = IERC20(sendToken);
            try sendERC20.transfer(destination, sendAmount) {
                emit LogOneWay(address(this), sendToken, sendAmount, destination);
            } catch {
                revert("ActionTransfer: ErrorTransfer");
            }
        } else
            destination.sendValue(sendAmount);
    }

    // Will be automatically called by gelato => do not use for encoding
    function gelatoInternal(
        bytes calldata _actionData,
        bytes calldata _taskState
    )
        external
        virtual
        override
        returns(ReturnType, bytes memory)
    {
        // 1. Decode Payload, if no taskState was present
        (address sendToken, uint256 sendAmount, address payable destination, bool returnsTaskState) = abi.decode(_actionData[4:], (address, uint256, address, bool));

        // 2. Check if taskState exists
        if (_taskState.length != 0) {
            (ReturnType returnType, bytes memory returnBytes) = abi.decode(_taskState, (ReturnType, bytes));
            if (returnType == ReturnType.UINT)
                (sendAmount) = abi.decode(returnBytes, (uint256));
            else if (returnType == ReturnType.UINT_AND_ERC20)
                (sendAmount, sendToken) = abi.decode(returnBytes, (uint256, address));
        }

        // 3. Call action
        action(sendToken, sendAmount, destination, returnsTaskState);

        return(returnsTaskState ? ReturnType.UINT : ReturnType.NONE, abi.encode(sendAmount));
    }

    // ===== ACTION CONDITIONS CHECK ========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(uint256, address _userProxy, bytes calldata _actionData, uint256)
        external
        view
        override
        virtual
        returns(string memory)
    {
        (address sendToken, uint256 sendAmount, /*address destination*/, /*bool returnsTaskState*/) = abi.decode(_actionData[4:], (address, uint256, address, bool));
        return termsOk(_userProxy, sendToken, sendAmount);
    }

    function termsOk(address _userProxy, address _sendToken, uint256 _sendAmount)
        public
        view
        virtual
        returns(string memory)
    {
        if (_sendToken != ETH_ADDRESS) {
            IERC20 sendERC20 = IERC20(_sendToken);
            try sendERC20.balanceOf(_userProxy) returns(uint256 sendERC20Balance) {
                if (sendERC20Balance < _sendAmount)
                    return "ActionTransfer: NotOkUserProxyBalance";
            } catch {
                return "ActionTransfer: ErrorBalanceOf";
            }
        } else {
            if (_userProxy.balance < _sendAmount)
                return "ActionTransfer: NotOkUserProxyBalance ETH";
        }

        // STANDARD return string to signal actionConditions Ok
        return OK;
    }
}
