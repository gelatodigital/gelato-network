// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;
pragma experimental ABIEncoderV2;

import { GelatoActionsStandard } from "../GelatoActionsStandard.sol";
import { IERC20 } from "../../external/IERC20.sol";
// import "../../../external/SafeERC20.sol";
import { Address } from "../../external/Address.sol";

struct ActionData {
    address user;
    address sendToken;
    address destination;
    uint256 sendAmount;
}

contract ActionERC20TransferFromNoStruct is GelatoActionsStandard {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using Address for address;

    function action(
        address user,
        address sendToken,
        address destination,
        uint256 sendAmount
    ) public payable virtual {
        IERC20 sendERC20 = IERC20(sendToken);
        try sendERC20.transferFrom(user, destination, sendAmount) {
            emit LogOneWay(user, sendToken, sendAmount, destination);
        } catch {
            revert("ActionERC20TransferFrom: ErrorTransferFromUser");
        }
    }

    // ======= ACTION CONDITIONS CHECK =========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(address _userProxy, bytes calldata _actionData)
        external
        view
        override
        virtual
        returns(string memory)  // actionTermsOk
    {
        (address user, address sendToken, , uint256 sendAmount) = abi.decode(_actionData[4:], (address, address, address, uint256));
        return termsOk(_userProxy, user, sendToken, sendAmount);
    }

    function termsOk(address _userProxy, address user, address sendToken, uint256 sendAmount)
        public
        view
        virtual
        returns(string memory)
    {
        if (!sendToken.isContract())
            return "ActionERC20TransferFrom: NotOkSendTokenAddress";

        IERC20 sendERC20 = IERC20(sendToken);
        try sendERC20.balanceOf(user) returns(uint256 sendERC20Balance) {
            if (sendERC20Balance < sendAmount)
                return "ActionERC20TransferFrom: NotOkUserSendTokenBalance";
        } catch {
            return "ActionERC20TransferFrom: ErrorBalanceOf";
        }

        try sendERC20.allowance(user, _userProxy) returns(uint256 allowance) {
            if (allowance < sendAmount)
                return "ActionERC20TransferFrom: NotOkUserProxySendTokenAllowance";
        } catch {
            return "ActionERC20TransferFrom: ErrorAllowance";
        }

        return OK;
    }

    function getUsersSendTokenBalance(
        address user,
        address sendToken,
        address,
        uint256
    )
        view
        public
        returns (uint256)
    {
        IERC20 sendERC20 = IERC20(sendToken);
        try sendERC20.balanceOf(user) returns(uint256 sendERC20Balance) {
            return sendERC20Balance;
        } catch {
            revert("ActionERC20TransferFromNoStruct.getUsersSendTokenBalance: Failed view call");
        }

    }
}
