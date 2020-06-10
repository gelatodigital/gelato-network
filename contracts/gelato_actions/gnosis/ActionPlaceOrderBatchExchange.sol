// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import {GelatoActionsStandardFull} from "../GelatoActionsStandardFull.sol";
import {DataFlow} from "../../gelato_core/interfaces/IGelatoCore.sol";
import {IERC20} from "../../external/IERC20.sol";
import {GelatoBytes} from "../../libraries/GelatoBytes.sol";
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

    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    uint256 public constant MAX_UINT = type(uint256).max;
    uint32 public constant BATCH_TIME = 300;

    IBatchExchange private immutable batchExchange;

    constructor(IBatchExchange _batchExchange) public { batchExchange = _batchExchange; }

    // ======= DEV HELPERS =========
    /// @dev use this function to encode the data off-chain for the action data field
    function getActionData(
        IERC20 _sellToken,
        uint128 _sellAmount,
        IERC20 _buyToken,
        uint128 _buyAmount,
        uint32 _batchDuration
    )
        public
        pure
        returns(bytes memory)
    {
        return abi.encodeWithSelector(
            this.action.selector,
            _sellToken,
            _sellAmount,
            _buyToken,
            _buyAmount,
            _batchDuration
        );
    }

    /// @dev Used by GelatoActionPipeline.isValid()
    function DATA_FLOW_IN_TYPE() public pure virtual override returns (bytes32) {
        return keccak256("TOKEN,UINT256");
    }

    /// @dev Used by GelatoActionPipeline.isValid()
    function DATA_FLOW_OUT_TYPE() public pure virtual override returns (bytes32) {
        return keccak256("TOKEN,UINT256");
    }

    // ======= ACTION IMPLEMENTATION DETAILS =========
    /// @notice Place order on Batch Exchange and request future withdraw for buy/sell token
    /// @param _sellToken ERC20 Token to sell on Batch Exchange
    /// @param _sellAmount Amount to sell
    /// @param _buyToken ERC20 Token to buy on Batch Exchange
    /// @param _buyAmount Amount to receive (at least)
    /// @param _batchDuration After how many batches funds should be
    function action(
        IERC20 _sellToken,
        uint128 _sellAmount,
        IERC20 _buyToken,
        uint128 _buyAmount,
        uint32 _batchDuration
    )
        public
        virtual
        delegatecallOnly("ActionPlaceOrderBatchExchange.action")
    {
        // 1. Fetch token Ids for sell & buy token on Batch Exchange
        uint16 sellTokenId = batchExchange.tokenAddressToIdMap(_sellToken);
        uint16 buyTokenId = batchExchange.tokenAddressToIdMap(_buyToken);

        // 2. Approve BatchExchange Contract for _sellToken
        _sellToken.safeIncreaseAllowance(address(batchExchange), _sellAmount);

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

    /// @dev Will be called by GelatoActionPipeline if Action.dataFlow.In
    //  => do not use for _actionData encoding
    function execWithDataFlowIn(bytes calldata _actionData, bytes calldata _inFlowData)
        external
        payable
        virtual
        override
    {
        (IERC20 sellToken, uint128 sellAmount) = _handleInFlowData(_inFlowData);
        (IERC20 buyToken,
         uint128 buyAmount,
         uint32 batchDuration) = _extractReusableActionData(_actionData);
        action(sellToken, sellAmount, buyToken, buyAmount, batchDuration);
    }

    /// @dev Will be called by GelatoActionPipeline if Action.dataFlow.Out
    //  => do not use for _actionData encoding
    function execWithDataFlowOut(bytes calldata _actionData)
        external
        payable
        virtual
        override
        returns (bytes memory)
    {
        (IERC20 sellToken,
         uint128 sellAmount,
         IERC20 buyToken,
         uint128 buyAmount,
         uint32 batchDuration) = abi.decode(
            _actionData[4:],
            (IERC20,uint128,IERC20,uint128,uint32)
        );
        action(sellToken, sellAmount, buyToken, buyAmount, batchDuration);
        return abi.encode(sellToken, sellAmount);
    }

    /// @dev Will be called by GelatoActionPipeline if Action.dataFlow.InAndOut
    //  => do not use for _actionData encoding
    function execWithDataFlowInAndOut(
        bytes calldata _actionData,
        bytes calldata _inFlowData
    )
        external
        payable
        virtual
        override
        returns (bytes memory)
    {
        (IERC20 sellToken, uint128 sellAmount) = _handleInFlowData(_inFlowData);
        (IERC20 buyToken,
         uint128 buyAmount,
         uint32 batchDuration) = _extractReusableActionData(_actionData);
        action(sellToken, sellAmount, buyToken, buyAmount, batchDuration);
        return abi.encode(sellToken, sellAmount);
    }

    // ======= ACTION TERMS CHECK =========
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
        returns(string memory)  // actionCondition
    {
        if (this.action.selector != GelatoBytes.calldataSliceSelector(_actionData))
            return "ActionPlaceOrderBatchExchange: invalid action selector";

        if (_dataFlow == DataFlow.In || _dataFlow == DataFlow.InAndOut)
            return "ActionPlaceOrderBatchExchange: termsOk check invalidated by inbound DataFlow";

        (IERC20 sellToken, uint128 _sellAmount) = abi.decode(
            _actionData[4:68],
            (IERC20,uint128)
        );

        try sellToken.balanceOf(_userProxy) returns(uint256 sellTokenBalance) {
            if (sellTokenBalance < _sellAmount)
                return "ActionPlaceOrderBatchExchange: NotOkUserSellTokenBalance";
        } catch {
            return "ActionPlaceOrderBatchExchange: ErrorBalanceOf";
        }

        return OK;
    }

    // ======= ACTION HELPERS =========
    function _handleInFlowData(bytes calldata _inFlowData)
        internal
        pure
        virtual
        returns(IERC20 sellToken, uint128 sellAmount)
    {
        uint256 sellAmount256;
        (sellToken, sellAmount256) = abi.decode(_inFlowData, (IERC20,uint256));
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
        returns (IERC20 buyToken, uint128 buyAmount, uint32 batchDuration)
    {
        (buyToken, buyAmount, batchDuration) = abi.decode(
            _actionData[68:],
            (IERC20,uint128,uint32)
        );
    }
}