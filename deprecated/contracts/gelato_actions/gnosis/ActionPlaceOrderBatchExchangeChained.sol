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



/// @title ActionPlaceOrderBatchExchangeChained
/// @author Luis Schliesske & Hilmar Orth
/// @notice Gelato action that 1) withdraws funds form user's  EOA, 2) deposits on Batch Exchange, 3) Places order on batch exchange and 4) requests future withdraw on batch exchange

contract ActionPlaceOrderBatchExchangeChained  {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    uint256 public constant MAX_UINT = uint256(-1);
    uint32 public constant BATCH_TIME = 300;

    IBatchExchange private immutable batchExchange;

    constructor(address _batchExchange) public {
        batchExchange = IBatchExchange(_batchExchange);
    }

    /// @notice Place order on Batch Exchange and request future withdraw for buy and sell token
    /// @param _user Users EOA address
    /// @param _sellToken Token to sell on Batch Exchange
    /// @param _buyToken Token to buy on Batch Exchange
    /// @param _sellAmount Amount to sell
    /// @param _buyAmount Amount to receive (at least)
    /// @param _batchDuration After how many batches funds should be
    function action(
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

        // 1. Transfer sellToken to proxy
        IERC20 sellToken = IERC20(_sellToken);
        sellToken.safeTransferFrom(_user, address(this), _sellAmount);


        // 2. Fetch token Ids for sell & buy token on Batch Exchange
        uint16 sellTokenId = batchExchange.tokenAddressToIdMap(_sellToken);
        uint16 buyTokenId = batchExchange.tokenAddressToIdMap(_buyToken);

        // 3. Approve sellToken to BatchExchange Contract
        sellToken.safeIncreaseAllowance(address(batchExchange), _sellAmount);

        // 4. Deposit sellAmount on BatchExchange
        try batchExchange.deposit(_sellToken, _sellAmount) {}
        catch {
            revert("batchExchange.deposit _sellToken failed");
        }

        // Get current batch id
        uint32 withdrawBatchId = uint32(block.timestamp / BATCH_TIME) + _batchDuration;

        // 5. Place Order on Batch Exchange
        // uint16 buyToken, uint16 sellToken, uint32 validUntil, uint128 buyAmount, uint128 sellAmount
        try batchExchange.placeOrder(buyTokenId, sellTokenId, withdrawBatchId, _buyAmount, _sellAmount) {}
        catch {
            revert("batchExchange.placeOrderfailed");
        }

        // 6. Request future withdraw on Batch Exchange for sellToken
        // requestFutureWithdraw(address token, uint256 amount, uint32 batchId)
        try batchExchange.requestFutureWithdraw(_sellToken, _sellAmount, withdrawBatchId) {}
        catch {
            revert("batchExchange.requestFutureWithdraw _sellToken failed");
        }

        // 7. Request future withdraw on Batch Exchange for sellToken
        // @DEV using MAX_UINT as we don't know in advance how much buyToken we will get
        // requestFutureWithdraw(address token, uint256 amount, uint32 batchId)
        try batchExchange.requestFutureWithdraw(_buyToken, MAX_UINT, withdrawBatchId) {}
        catch {
            revert("batchExchange.requestFutureWithdraw _buyToken failed");
        }

        bytes memory placeOrderPayload = abi.encodeWithSelector(
            this.action.selector,
            _user,
            _sellToken,
            _buyToken,
            _sellAmount,
            _buyAmount,
            _batchDuration,
            // Withdraw
            _gelatoCore,
            _taskWithdraw
        );

        _taskWithdraw.task.actions[0].data = placeOrderPayload;

        try IGelatoCore(_gelatoCore).submitTask(_taskWithdraw){}
        catch{
            revert("ActionPlaceOrderBatchExchangeChained.action: Failed to create chained Task");
        }

    }

    // ======= ACTION CONDITIONS CHECK =========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(address _userProxy, bytes calldata _actionData)
        external
        view
        virtual
        returns(string memory)  // actionCondition
    {
        (
            address _user,
            address _sellToken,
            address _buyToken,
            uint128 _sellAmount,
            ,
            ,
            // Withdraw
            ,
        ) = abi.decode(_actionData[4:], (address,address,address,uint128,uint128,uint32,address,Task));

        return _actionProviderTermsCheck(_user, _userProxy, _sellToken, _buyToken, _sellAmount);
    }

    /// @notice Verify that EOA has sufficinet balance and gave proxy adequate allowance
    /// @param _user Users EOA address
    /// @param _userProxy Users Proxy address
    /// @param _sellToken Token to sell on Batch Exchange
    /// @param _sellAmount Amount to sell
    function _actionProviderTermsCheck(
        address _user, address _userProxy, address _sellToken, address _buyToken, uint128 _sellAmount
    )
        internal
        view
        virtual
        returns(string memory)  // actionCondition
    {
        IERC20 sendERC20 = IERC20(_sellToken);
        try sendERC20.balanceOf(_user) returns(uint256 sendERC20Balance) {
            if (sendERC20Balance < _sellAmount)
                return "ActionPlaceOrderBatchExchangeChained: NotOkUserSendTokenBalance";
        } catch {
            return "ActionPlaceOrderBatchExchangeChained: ErrorBalanceOf";
        }
        try sendERC20.allowance(_user, _userProxy)
            returns(uint256 userProxySendTokenAllowance)
        {
            if (userProxySendTokenAllowance < _sellAmount)
                return "ActionPlaceOrderBatchExchangeChained: NotOkUserProxySendTokenAllowance";
        } catch {
            return "ActionPlaceOrderBatchExchangeChained: ErrorAllowance";
        }

        bool sellTokenWithdrawable = batchExchange.hasValidWithdrawRequest(_userProxy, _sellToken);

        if (!sellTokenWithdrawable) {
            return "ActionPlaceOrderBatchExchangeChained: Sell Token not withdrawable yet";
        }

        bool buyTokenWithdrawable = batchExchange.hasValidWithdrawRequest(_userProxy, _buyToken);

        if (!buyTokenWithdrawable) {
            return "ActionPlaceOrderBatchExchangeChained: Buy Token not withdrawable yet";
        }

        // STANDARD return string to signal actionConditions Ok
        return "OK";
    }


}