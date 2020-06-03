// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;
pragma experimental ABIEncoderV2;

import { GelatoActionsStandard } from "../GelatoActionsStandard.sol";
import { IERC20 } from "../../external/IERC20.sol";
import { SafeERC20 } from "../../external/SafeERC20.sol";
import { Address } from "../../external/Address.sol";
import { ProviderFeeStore } from "../../gelato_helpers/ProviderFeeStore.sol";

contract ActionERC20TransferFromWithFee is GelatoActionsStandard {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using Address for address;
    using SafeERC20 for IERC20;

    address public immutable thisAction;
    ProviderFeeStore public immutable providerFeeStore;

    constructor(ProviderFeeStore _globalFeeStorage) public {
        thisAction = address(this);
        providerFeeStore = _globalFeeStorage;
    }

    function action(
        address _user,
        IERC20 _sendToken,
        address _destination,
        uint256 _sendAmount
    )
        public
        payable
        virtual
    {
        // Fetch and delete provider fee store
        (uint256 sendAmount,
         uint256 feeAmount,
         address provider) = providerFeeStore.getAmountWithFeesAndReset(thisAction);

        if (sendAmount == 0) sendAmount = _sendAmount;

        // Pay Fees
        if (feeAmount > 0) _sendToken.safeTransferFrom(_user, provider, feeAmount);

        // Execute Action
        _sendToken.safeTransferFrom(_user, _destination, sendAmount);

        // Update ProviderFeeStore
        providerFeeStore.updateAmountStore(sendAmount);

        emit LogOneWay(_user, address(_sendToken), sendAmount, _destination);
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
        (address user, IERC20 sendToken, , uint256 sendAmount) = abi.decode(
            _actionData[4:],
            (address, IERC20, address, uint256)
        );
        return termsOk(_userProxy, user, sendToken, sendAmount);
    }

    function termsOk(address _userProxy, address user, IERC20 sendToken, uint256 sendAmount)
        public
        view
        virtual
        returns(string memory)
    {
        try sendToken.balanceOf(user) returns(uint256 sendERC20Balance) {
            if (sendERC20Balance < sendAmount)
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
