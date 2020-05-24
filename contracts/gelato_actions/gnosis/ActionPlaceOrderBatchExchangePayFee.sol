// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;
pragma experimental ABIEncoderV2;

import { GelatoActionsStandard } from "../GelatoActionsStandard.sol";
import { IGelatoAction } from "../IGelatoAction.sol";
import { IERC20 } from "../../external/IERC20.sol";
import { SafeERC20 } from "../../external/SafeERC20.sol";
import { SafeMath } from "../../external/SafeMath.sol";
import { IBatchExchange } from "../../dapp_interfaces/gnosis/IBatchExchange.sol";
import { Task, IGelatoCore } from "../../gelato_core/interfaces/IGelatoCore.sol";
import { FeeExtractor } from "../../gelato_helpers/FeeExtractor.sol";

struct Order {
    address user;
    address sellToken;
    address buyToken;
    uint128 sellAmount;
    uint128 buyAmount;
    uint32 batchDuration;
}

/// @title ActionPlaceOrderBatchExchangePayFee
/// @author Luis Schliesske & Hilmar Orth
/// @notice Gelato action that 1) executes PlaceOrder on Batch Exchange, 2) buys withdraw credit from provider and 3) creates withdraw task on gelato

contract ActionPlaceOrderBatchExchangePayFee is GelatoActionsStandard {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    uint256 public constant MAX_UINT = uint256(-1);
    uint32 public constant BATCH_TIME = 300;

    IBatchExchange public immutable batchExchange;
    FeeExtractor public immutable feeExtractor;

    constructor(address _batchExchange, address _feeExtractor) public {
        batchExchange = IBatchExchange(_batchExchange);
        feeExtractor = FeeExtractor(_feeExtractor);
    }

    /// @notice Place order on Batch Exchange and request future withdraw for buy and sell token
    /// @param _order object: user, sellToken, buyToken, sellAmount, buyAmount, batchDuration
    function action(Order memory _order) public virtual {
        /*
        - [ ] a) transferFrom an ERC20 from the proxies owner account to the proxy,
        - [ ] b) calls ‘deposit’  token in EpochTokenLocker contract
        - [ ] c) calls ‘placeOrder’ in BatchExchange contract, inputting valid until 3 auctions from current one
        - [ ] d) calls ‘requestFutureWithdraw’ with batch id of the n + 3 and amount arbitrary high (higher than expected output) contract in EpochTokenLocker
        - [ ] e) submits a task on gelato with condition = address(0) and action “withdraw()” in EpochTokenLocker contract
        */

        // 1. Transfer sellToken to proxy
        IERC20 sellToken = IERC20(_order.sellToken);
        sellToken.safeTransferFrom(_order.user, address(this), _order.sellAmount);

        // 2. Pay fee to provider
        uint256 fee = feeExtractor.getFeeAmount(_order.sellToken);
        sellToken.safeIncreaseAllowance(address(feeExtractor), fee);
        feeExtractor.payFee(_order.sellToken, fee);
        // Deduct fee from sell amount
        _order.sellAmount -= uint128(fee);


        // 2. Fetch token Ids for sell & buy token on Batch Exchange
        uint16 sellTokenId = batchExchange.tokenAddressToIdMap(_order.sellToken);
        uint16 buyTokenId = batchExchange.tokenAddressToIdMap(_order.buyToken);

        // 3. Approve sellToken to BatchExchange Contract
        sellToken.safeIncreaseAllowance(address(batchExchange), _order.sellAmount);

        // 4. Deposit sellAmount on BatchExchange
        try batchExchange.deposit(_order.sellToken, _order.sellAmount) {
        } catch {
            revert("batchExchange.deposit _order.sellToken failed");
        }

        // Get current batch id
        uint32 withdrawBatchId = uint32(block.timestamp / BATCH_TIME) + _order.batchDuration;

        // 5. Place Order on Batch Exchange
        // uint16 buyToken, uint16 sellToken, uint32 validUntil, uint128 buyAmount, uint128 sellAmount
        try batchExchange.placeOrder(
            buyTokenId,
            sellTokenId,
            withdrawBatchId,
            _order.buyAmount,
            _order.sellAmount
        ) {
        } catch {
            revert("batchExchange.placeOrderfailed");
        }

        // 6. Request future withdraw on Batch Exchange for sellToken
        // requestFutureWithdraw(address token, uint256 amount, uint32 batchId)
        try batchExchange.requestFutureWithdraw(
            _order.sellToken,
            _order.sellAmount,
            withdrawBatchId
        ) {
        } catch {
            revert("batchExchange.requestFutureWithdraw _order.sellToken failed");
        }

        // 7. Request future withdraw on Batch Exchange for sellToken
        // @DEV using MAX_UINT as we don't know in advance how much buyToken we will get
        // requestFutureWithdraw(address token, uint256 amount, uint32 batchId)
        try batchExchange.requestFutureWithdraw(_order.buyToken, MAX_UINT, withdrawBatchId) {
        } catch {
            revert("batchExchange.requestFutureWithdraw _order.buyToken failed");
        }

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
        Order memory order = abi.decode(_actionData[4:], (Order));
        return _actionProviderTermsCheck(_userProxy, order);
    }

    /// @notice Verify that EOA has sufficinet balance and gave proxy adequate allowance
    /// @param _order .user Users EOA address
    function _actionProviderTermsCheck(address _userProxy, Order memory _order)
        internal
        view
        virtual
        returns(string memory)  // actionCondition
    {
        IERC20 sendERC20 = IERC20(_order.sellToken);
        try sendERC20.balanceOf(_order.user) returns(uint256 sendERC20Balance) {
            if (sendERC20Balance < _order.sellAmount)
                return "ActionPlaceOrderBatchExchange: NotOkUserSendTokenBalance";
        } catch {
            return "ActionPlaceOrderBatchExchange: ErrorBalanceOf";
        }
        try sendERC20.allowance(_order.user, _userProxy)
            returns(uint256 userProxySendTokenAllowance)
        {
            if (userProxySendTokenAllowance < _order.sellAmount)
                return "ActionPlaceOrderBatchExchange: NotOkUserProxySendTokenAllowance";
        } catch {
            return "ActionPlaceOrderBatchExchange: ErrorAllowance";
        }

        // STANDARD return string to signal actionConditions Ok
        return "OK";
    }
}