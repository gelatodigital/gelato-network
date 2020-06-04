// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;

import { GelatoActionsStandard } from "../GelatoActionsStandard.sol";
import { IGelatoAction } from "../IGelatoAction.sol";
import { IERC20 } from "../../external/IERC20.sol";
import { IBatchExchange } from "../../dapp_interfaces/gnosis/IBatchExchange.sol";
import { IMedianizer } from "../../dapp_interfaces/maker/IMakerMedianizer.sol";
import { FeeExtractor } from "../../gelato_helpers/FeeExtractor.sol";
import { SafeERC20 } from "../../external/SafeERC20.sol";
import { SafeMath } from "../../external/SafeMath.sol";


/// @title ActionWithdrawBatchExchangeWithFee
/// @author Luis Schliesske & Hilmar Orth
/// @notice Gelato action that 1) withdraws funds from Batch Exchange and 2) sends funds back to users EOA (minus fee)
contract ActionWithdrawBatchExchangeWithFee is GelatoActionsStandard {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // BatchExchange
    IBatchExchange public immutable batchExchange;

    // Fee finder
    FeeExtractor public immutable feeExtractor;

    constructor(address _batchExchange, address _feeExtractor) public {
        batchExchange = IBatchExchange(_batchExchange);
        feeExtractor = FeeExtractor(_feeExtractor);
    }

    /// @notice Withdraw sell and buy token from Batch Exchange and send funds back to _user EOA
    /// @param _sellToken Token to sell on Batch Exchange
    /// @param _buyToken Token to buy on Batch Exchange
    function action(
        address _user,
        address _sellToken,
        address _buyToken
    )
        public
        virtual
    {

        // 1. Use Withdraw Credit
        feeExtractor.redeemCredit();

        // 2. Withdraw buy tokens
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
           revert("ActionWithdrawBatchExchangeWithFee.withdraw _buyToken failed");
        }

        // 3. Withdraw sell tokens
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
            revert("ActionWithdrawBatchExchangeWithFee.withdraw _sellToken failed");
        }
    }

    // Will be automatically called by gelato => do not use for encoding
    function gelatoInternal(bytes calldata _actionData, bytes calldata)
        external
        virtual
        override
        returns(ReturnType, bytes memory)
    {
        (address _user,
         address _sellToken,
         address _buyToken) = abi.decode(_actionData[4:], (address, address, address));
        action(_user, _sellToken, _buyToken);
    }

    // ======= ACTION CONDITIONS CHECK =========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(uint256, address _userProxy, bytes calldata _actionData, uint256)
        external
        view
        override
        virtual
        returns(string memory)  // actionCondition
    {
        (, address _sellToken, address _buyToken) = abi.decode(
            _actionData[4:],
            (address,address,address)
        );
        return termsOk(_userProxy, _sellToken, _buyToken);
    }

    /// @notice Verify that _userProxy has two valid withdraw request on batch exchange (for buy and sell token)
    /// @param _userProxy Users Proxy address
    /// @param _sellToken Token to sell on Batch Exchange
    /// @param _buyToken Amount to sell
    function termsOk(address _userProxy, address _sellToken, address _buyToken)
        public
        view
        virtual
        returns(string memory)  // actionCondition
    {
        bool sellTokenWithdrawable = batchExchange.hasValidWithdrawRequest(_userProxy, _sellToken);

        if (!sellTokenWithdrawable)
            return "ActionWithdrawBatchExchangeWithFee: Sell Token not withdrawable yet";

        bool buyTokenWithdrawable = batchExchange.hasValidWithdrawRequest(_userProxy, _buyToken);

        if (!buyTokenWithdrawable)
            return "ActionWithdrawBatchExchangeWithFee: Buy Token not withdrawable yet";

        bool proxyHasCredit = feeExtractor.proxyHasCredit(_userProxy);

        if (!proxyHasCredit)
            return "ActionWithdrawBatchExchangeWithFee: Proxy has insufficient credit";

        return OK;
    }
}