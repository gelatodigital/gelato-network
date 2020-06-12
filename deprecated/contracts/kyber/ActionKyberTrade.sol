// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;

import {GelatoActionsStandardFull} from "../GelatoActionsStandardFull.sol";
import {DataFlow} from "../../gelato_core/interfaces/IGelatoCore.sol";
import {Address} from "../../external/Address.sol";
import {SafeMath} from "../../external/SafeMath.sol";
import {IERC20} from "../../external/IERC20.sol";
import {IKyber} from "../../dapp_interfaces/kyber/IKyber.sol";

contract ActionKyberTrade is GelatoActionsStandardFull {
    // using SafeERC20 for IERC20; <- internal library methods vs. try/catch
    using Address for address;
    using SafeMath for uint256;

    function action(
        // Standard Action Params
        address _user,
        address _userProxy,
        address _sendToken,
        uint256 _sendAmt,
        // Specific Action Params
        address _receiveToken
    )
        external
        virtual
    {
        require(address(this) == _userProxy, "ErrorUserProxy");

        // !!!!!!!!! MAINNET !!!!!!
        address kyberAddress = 0x818E6FECD516Ecc3849DAf6845e3EC868087B755;

        IERC20 sendERC20 = IERC20(_sendToken);
        try sendERC20.transferFrom(_user, _userProxy, _sendAmt) {} catch {
            revert("ErrorTransferFromUser");
        }
        try sendERC20.approve(kyberAddress, _sendAmt) {} catch {
            revert("ErrorApproveKyber");
        }

        // !! Dapp Interaction !!
        try IKyber(kyberAddress).trade(
            _sendToken,
            _sendAmt,
            _receiveToken,
            _user,  // receiver
            2**255,
            0,  // minConversionRate (if price condition, limit order still possible)
            address(0xe1F076849B781b1395Fd332dC1758Dbc129be6EC)  // fee-sharing: gelato-node
        )
            returns(uint256 receiveAmt)
        {
            emit LogTwoWay(
                _user,  // origin
                _sendToken,
                _sendAmt,
                kyberAddress,  // destination
                _receiveToken,
                receiveAmt,
                _user  // receiver
            );
        } catch {
            revert("KyberTradeError");
        }
    }

    // ====== ACTION TERMS CHECK ==========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(
        uint256,  // taskReceipId
        address _userProxy,
        bytes calldata _actionData,
        DataFlow _dataFlow,
        uint256,  // value
        uint256  // cycleId
    )
        public
        view
        virtual
        override
        returns(string memory)  // actionTermsOk
    {
        (address _user, address _userProxy, address _sendToken, uint256 _sendAmt) = abi.decode(
            _actionData[4:132],
            (address,address,address,uint256)
        );

        if (!_sendToken.isContract()) return "ActionKyberTrade: NotOkSendTokenAddress";

        IERC20 sendERC20 = IERC20(_sendToken);
        try sendERC20.balanceOf(_user) returns(uint256 userSendTokenBalance) {
            if (userSendTokenBalance < _sendAmt)
                return "ActionKyberTrade: NotOkUserSendTokenBalance";
        } catch {
            return "ActionKyberTrade: ErrorBalanceOf";
        }
        try sendERC20.allowance(_user, _userProxy) returns(uint256 userProxySendTokenAllowance) {
            if (userProxySendTokenAllowance < _sendAmt)
                return "ActionKyberTrade: NotOkUserProxySendTokenAllowance";
        } catch {
            return "ActionKyberTrade: ErrorAllowance";
        }

        // STANDARD return string to signal actionConditions Ok
        return OK;
    }

    // ============ API for FrontEnds ===========
    function getUsersSendTokenBalance(
        // Standard Action Params
        address _user,
        address _userProxy,
        // Specific Action Params
        address _sendToken,  // sendToken
        uint256,
        address
    )
        external
        view
        virtual
        returns(uint256)
    {
        _userProxy;  // silence warning
        IERC20 sendERC20 = IERC20(_sendToken);
        try sendERC20.balanceOf(_user) returns(uint256 userSendTokenBalance) {
            return userSendTokenBalance;
        } catch {
            revert(
                "Error: ActionKyberTrade.getUsersSendTokenBalance: balanceOf"
            );
        }
    }
}
