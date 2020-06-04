// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;
pragma experimental ABIEncoderV2;

import { GelatoActionsStandard } from "../../../../contracts/gelato_actions/GelatoActionsStandard.sol";
import { IGelatoAction } from "../../../../contracts/gelato_actions/IGelatoAction.sol";
import { IERC20 } from "../../../../contracts/external/IERC20.sol";
import { SafeERC20 } from "../../../../contracts/external/SafeERC20.sol";
import { SafeMath } from "../../../../contracts/external/SafeMath.sol";
import { Math } from "../../../../contracts/external/Math.sol";
import { Order, IBatchExchange } from "../../../../contracts/dapp_interfaces/gnosis/IBatchExchange.sol";
import { Task, IGelatoCore } from "../../../../contracts/gelato_core/interfaces/IGelatoCore.sol";
import { FeeExtractor } from "../../../../contracts/gelato_helpers/FeeExtractor.sol";
import {IGelatoProviderModule} from "../../../../contracts/gelato_core/interfaces/IGelatoProviderModule.sol";
import {IGelatoCondition} from "../../../../contracts//gelato_conditions/IGelatoCondition.sol";
import {ActionPlaceOrderBatchExchangePayFee} from "../../../../contracts/gelato_actions/gnosis/chained/ActionPlaceOrderBatchExchangePayFee.sol";


/// @title ActionWithdrawBatchExchangeChained
/// @author Luis Schliesske & Hilmar Orth
/// @notice Gelato action that 1) withdraws funds from Batch Exchange and 2) sends funds back to users EOA (minus fee)
contract ActionWithdrawBatchExchangeChained is ActionPlaceOrderBatchExchangePayFee {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    constructor(address _batchExchange, address _feeExtractor) ActionPlaceOrderBatchExchangePayFee(
        _batchExchange,
        _feeExtractor
    ) public {}

    /// @notice Withdraw sell and buy token from Batch Exchange and send funds back to _user EOA
    /// @param _sellToken Token to sell on Batch Exchange
    /// @param _buyToken Token to buy on Batch Exchange
    function actionChained(
        address _user,
        address _sellToken,
        address _buyToken,
        uint128 _sellAmount,
        uint128 _buyAmount,
        uint32 _batchDuration,
        // Withdraw
        address _gelatoCore,
        Task memory _taskWithdraw
    )
        public
        virtual
    {

        // 1. Withdraw buy tokens
        IERC20 buyToken = IERC20(_buyToken);
        uint256 preBuyTokenBalance = buyToken.balanceOf(address(this));
        try batchExchange.withdraw(address(this), _buyToken) {
            uint256 postBuyTokenBalance = buyToken.balanceOf(address(this));
            if (postBuyTokenBalance > preBuyTokenBalance) {
                uint256 withdrawAmount = postBuyTokenBalance - preBuyTokenBalance;
                buyToken.safeTransfer(_user, withdrawAmount);
            }
        } catch {
           // Do not revert, as order might not have been fulfilled.
           revert("ActionWithdrawBatchExchange.withdraw _buyToken failed");
        }

        // 5. Withdraw sell tokens
        IERC20 sellToken = IERC20(_sellToken);
        uint256 preSellTokenBalance = sellToken.balanceOf(address(this));
        try batchExchange.withdraw(address(this), _sellToken) {
            uint256 postSellTokenBalance = sellToken.balanceOf(address(this));
            if (postSellTokenBalance > preSellTokenBalance) {
                uint256 withdrawAmount = postSellTokenBalance - preSellTokenBalance;
                sellToken.safeTransfer(_user, withdrawAmount);
            }
        } catch {
            // Do not revert, as order might have been filled completely
            revert("ActionWithdrawBatchExchange.withdraw _sellToken failed");
        }


        bytes memory withdrawPayload = abi.encodeWithSelector(
            this.actionChained.selector,
            _user,
            _sellToken,
            _buyToken,
            _sellAmount,
            _buyAmount,
            _batchDuration,
            _gelatoCore,
            _taskWithdraw
        );

        _taskWithdraw.task.actions[0].data = withdrawPayload;

        action(
            _user,
            _sellToken,
            _buyToken,
            _sellAmount,
            _buyAmount,
            _batchDuration
        );

    }

    // ======= ACTION CONDITIONS CHECK =========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(address _userProxy, bytes calldata _actionData)
        external
        view
        override
        virtual
        returns(string memory)  // actionCondition
    {
        (address _user, address _sellToken, address _buyToken, uint128 _sellAmount) = abi.decode(
            _actionData[4:],
            (address,address,address,uint128)
        );
        return _actionConditionsCheck(
            _userProxy, _sellToken, _buyToken, _user, _sellAmount
        );
    }

    /// @notice Verify that _userProxy has two valid withdraw request on batch exchange (for buy and sell token)
    /// @param _userProxy Users Proxy address
    /// @param _sellToken Token to sell on Batch Exchange
    /// @param _buyToken Amount to sell
    function _actionConditionsCheck(
        address _userProxy,
        address _sellToken,
        address _buyToken,
        address _user,
        uint128 _sellAmount
    )
        internal
        view
        virtual
        returns(string memory)  // actionCondition
    {

        bool sellTokenWithdrawable = batchExchange.hasValidWithdrawRequest(_userProxy, _sellToken);

        if (!sellTokenWithdrawable) {
            return "ActionWithdrawBatchExchange: Sell Token not withdrawable yet";
        }

        bool buyTokenWithdrawable = batchExchange.hasValidWithdrawRequest(_userProxy, _buyToken);

        if (!buyTokenWithdrawable) {
            return "ActionWithdrawBatchExchange: Buy Token not withdrawable yet";
        }

        bool proxyHasCredit = feeExtractor.proxyHasCredit(_userProxy);

        if (!proxyHasCredit) {
            return "ActionWithdrawBatchExchange: Proxy has insufficient credit";
        }

        try IERC20(_sellToken).allowance(_user, _userProxy)
            returns(uint256 userProxySendTokenAllowance)
        {
            if (userProxySendTokenAllowance < _sellAmount)
                return "ActionPlaceOrderBatchExchange: NotOkUserProxySendTokenAllowance";
        } catch {
            return "ActionPlaceOrderBatchExchange: ErrorAllowance";
        }

        return "OK";

    }
}