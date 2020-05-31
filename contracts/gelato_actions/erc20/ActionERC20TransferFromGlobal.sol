// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;
pragma experimental ABIEncoderV2;

import { GelatoActionsStandard } from "../GelatoActionsStandard.sol";
import { IERC20 } from "../../external/IERC20.sol";
import { SafeERC20 } from "../../external/SafeERC20.sol";
import { Address } from "../../external/Address.sol";
import { GlobalState } from "../../gelato_helpers/GlobalState.sol";

contract ActionERC20TransferFromGlobal is GelatoActionsStandard {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using Address for address;
    using SafeERC20 for IERC20;

    GlobalState public immutable globalState;
    address public immutable myself;

    constructor(GlobalState _globalFeeStorage) public {
        globalState = _globalFeeStorage;
        myself = address(this);
    }

    function action(
        address _user,
        address _sendToken,
        address _destination,
        uint256 _sendAmount
    ) public payable virtual {

        // Fetch and delete global state
        (uint256 sendAmount, uint256 feeAmount, address provider) = globalState.getAmountWithFees(myself);
        if(sendAmount == 0) sendAmount = _sendAmount;

        IERC20 sendERC20 = IERC20(_sendToken);

        // Pay Fees
        if(feeAmount > 0) sendERC20.safeTransferFrom(_user, provider, feeAmount);

        // Execute Action
        sendERC20.safeTransferFrom(_user, _destination, sendAmount);

        // Update Global State
        globalState.updateUintStore(sendAmount);

        emit LogOneWay(_user, _sendToken, sendAmount, _destination);
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
        (address user, address sendToken, , uint256 sendAmount) = abi.decode(_actionData[4:], (address, address, address, uint256));
        return termsOk(_userProxy, user, sendToken, sendAmount);
    }

    function termsOk(address _userProxy, address user, address sendToken, uint256 sendAmount)
        public
        view
        virtual
        returns(string memory)
    {

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
}
