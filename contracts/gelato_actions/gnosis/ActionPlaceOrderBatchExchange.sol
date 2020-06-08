// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import {GelatoActionsStandardFull} from "../GelatoActionsStandardFull.sol";
import {DataFlow} from "../../gelato_core/interfaces/IGelatoCore.sol";
import {DataFlowType} from "../action_pipeline_interfaces/DataFlowType.sol";
import {IERC20} from "../../external/IERC20.sol";
import {SafeERC20} from "../../external/SafeERC20.sol";
import {SafeMath} from "../../external/SafeMath.sol";
import {IBatchExchange} from "../../dapp_interfaces/gnosis/IBatchExchange.sol";
import {Task} from "../../gelato_core/interfaces/IGelatoCore.sol";

/// @title ActionPlaceOrderBatchExchange
/// @author Luis Schliesske & Hilmar Orth
/// @notice Gelato Action that
///  1) withdraws funds form user's  EOA,
///  2) deposits on Batch Exchange,
///  3) Places order on batch exchange and
//   4) requests future withdraw on batch exchange
contract ActionPlaceOrderBatchExchange is GelatoActionsStandardFull {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    uint256 public constant MAX_UINT = type(uint256).max;
    uint32 public constant BATCH_TIME = 300;

    IBatchExchange private immutable batchExchange;

    constructor(IBatchExchange _batchExchange) public { batchExchange = _batchExchange; }

    /// @notice Place order on Batch Exchange and request future withdraw for buy/sell token
    /// @param _sellToken Token to sell on Batch Exchange
    /// @param _sellAmount Amount to sell
    /// @param _buyToken Token to buy on Batch Exchange
    /// @param _buyAmount Amount to receive (at least)
    /// @param _batchDuration After how many batches funds should be
    function action(
        address _sellToken,
        uint128 _sellAmount,
        address _buyToken,
        uint128 _buyAmount,
        uint32 _batchDuration
    )
        public
        virtual
        delegatecallOnly("ActionPlaceOrderBatchExchange.action")
    {
        IERC20 sellToken = IERC20(_sellToken);

        // 1. Fetch token Ids for sell & buy token on Batch Exchange
        uint16 sellTokenId = batchExchange.tokenAddressToIdMap(_sellToken);
        uint16 buyTokenId = batchExchange.tokenAddressToIdMap(_buyToken);

        // 2. Approve sellToken to BatchExchange Contract
        sellToken.safeIncreaseAllowance(address(batchExchange), _sellAmount);

        // 3. Deposit _sellAmount on BatchExchange
        try batchExchange.deposit(_sellToken, _sellAmount) {
        } catch {
            revert("ActionPlaceOrderBatchExchange.deposit _sellToken failed");
        }

        // Get current batch id
        uint32 withdrawBatchId = uint32(block.timestamp / BATCH_TIME) + _batchDuration;

        // 4. Place Order on Batch Exchange
        // uint16 buyToken, uint16 sellToken, uint32 validUntil, uint128 buyAmount, uint128 _sellAmount
        try batchExchange.placeOrder(
            buyTokenId,
            sellTokenId,
            withdrawBatchId,
            _buyAmount,
            _sellAmount
        ) {
        } catch {
            revert("ActionPlaceOrderBatchExchange.placeOrderfailed");
        }

        // 5. Request future withdraw on Batch Exchange for sellToken
        // requestFutureWithdraw(address token, uint256 amount, uint32 batchId)
        try batchExchange.requestFutureWithdraw(_sellToken, _sellAmount, withdrawBatchId) {
        } catch {
            revert("ActionPlaceOrderBatchExchange.requestFutureWithdraw _sellToken failed");
        }

        // 6. Request future withdraw on Batch Exchange for sellToken
        // @DEV using MAX_UINT as we don't know in advance how much buyToken we will get
        // requestFutureWithdraw(address token, uint256 amount, uint32 batchId)
        try batchExchange.requestFutureWithdraw(_buyToken, MAX_UINT, withdrawBatchId) {
        } catch {
            revert("ActionPlaceOrderBatchExchange.requestFutureWithdraw _buyToken failed");
        }
    }

    ///@dev Will be called by GelatoActionPipeline if Action.dataFlow.In
    //  => do not use for _actionData encoding
    function execWithDataFlowIn(bytes calldata _actionData, bytes calldata _inFlowData)
        external
        payable
        virtual
        override
    {
        (address sellToken, uint128 sellAmount) = _handleInFlowData(_inFlowData);
        (address buyToken,
         uint128 buyAmount,
         uint32 batchDuration) = _extractReusableActionData(_actionData);

        action(sellToken, sellAmount, buyToken, buyAmount, batchDuration);
    }

    ///@dev Will be called by GelatoActionPipeline if Action.dataFlow.Out
    //  => do not use for _actionData encoding
    function execWithDataFlowOut(bytes calldata _actionData)
        external
        payable
        virtual
        override
        returns (DataFlowType, bytes memory)
    {
        (address sellToken,
         uint128 sellAmount,
         address buyToken,
         uint128 buyAmount,
         uint32 batchDuration) = abi.decode(
            _actionData[4:],
            (address,uint128,address,uint128,uint32)
        );
        action(sellToken, sellAmount, buyToken, buyAmount, batchDuration);
        return (DataFlowType.UINT256, abi.encode(sellAmount));
    }

    ///@dev Will be called by GelatoActionPipeline if Action.dataFlow.InAndOut
    //  => do not use for _actionData encoding
    function execWithDataFlowInAndOut(
        bytes calldata _actionData,
        bytes calldata _inFlowData
    )
        external
        payable
        virtual
        override
        returns (DataFlowType, bytes memory)
    {
        (address sellToken, uint128 sellAmount) = _handleInFlowData(_inFlowData);
        (address buyToken,
         uint128 buyAmount,
         uint32 batchDuration) = _extractReusableActionData(_actionData);

        action(sellToken, sellAmount, buyToken, buyAmount, batchDuration);

        return (DataFlowType.UINT256, abi.encode(sellAmount));
    }

    // ======= ACTION TERMS CHECK =========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(
        uint256,  // taskReceipId
        address _userProxy,
        bytes calldata _actionData,
        DataFlow _dataFlow,
        uint256  // value
    )
        public
        view
        virtual
        override
        returns(string memory)  // actionCondition
    {
        if (_dataFlow == DataFlow.In || _dataFlow == DataFlow.InAndOut)
            return "ActionPlaceOrderBatchExchange: termsOk check invalidated by inbound DataFlow";

        (address _sellToken, uint128 _sellAmount) = abi.decode(
            _actionData[4:68],
            (address,uint128)
        );
        IERC20 sellToken = IERC20(_sellToken);
        try sellToken.balanceOf(_userProxy) returns(uint256 sellTokenBalance) {
            if (sellTokenBalance < _sellAmount)
                return "ActionPlaceOrderBatchExchange: NotOkUserSellTokenBalance";
        } catch {
            return "ActionPlaceOrderBatchExchange: ErrorBalanceOf";
        }

        // STANDARD return string to signal actionConditions Ok
        return "OK";
    }

    // ======= ACTION HELPERS =========
    function _handleInFlowData(bytes calldata _inFlowData)
        internal
        pure
        virtual
        returns(address sellToken, uint128 sellAmount)
    {
        (DataFlowType inFlowDataType, bytes memory inFlowData) = abi.decode(
            _inFlowData,
            (DataFlowType, bytes)
        );

        uint256 sellAmount256;
        if (inFlowDataType == DataFlowType.TOKEN_AND_UINT256)
            (sellToken, sellAmount256) = abi.decode(inFlowData, (address,uint256));
        else
            revert("ActionPlaceOrderBatchExchange._handleInFlowData: invalid inFlowDataType");

        sellAmount = uint128(sellAmount256);
        require(
            sellAmount == sellAmount256,
            "ActionPlaceOrderBatchExchange._handleInFlowData: sellAmount conversion error"
        );
    }

    function _extractReusableActionData(bytes calldata _actionData)
        internal
        pure
        virtual
        returns (address buyToken, uint128 buyAmount, uint32 batchDuration)
    {
        ( , , buyToken, buyAmount, batchDuration) = abi.decode(
            _actionData[4:],
            (address,uint128,address,uint128,uint32)
        );
    }
}