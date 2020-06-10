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

    IBatchExchange public immutable batchExchange;

    constructor(IBatchExchange _batchExchange) public { batchExchange = _batchExchange; }

    // ======= DEV HELPERS =========
    /// @dev use this function to encode the data off-chain for the action data field
    function getActionData(
        address _origin,
        IERC20 _sellToken,
        uint128 _sellAmount,
        IERC20 _buyToken,
        uint128 _buyAmount,
        uint32 _batchDuration
    )
        public
        pure
        virtual
        returns(bytes memory)
    {
        return abi.encodeWithSelector(
            this.action.selector,
            _origin,
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
        address _origin,
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

        // 1. Get current batch id
        uint32 withdrawBatchId = uint32(block.timestamp / BATCH_TIME) + _batchDuration;

        // 2. Optional: If light proxy, transfer from funds to proxy
        if (_origin != address(0) && _origin != address(this)) {
            _sellToken.safeTransferFrom(_origin, address(this), _sellAmount);
        }

        // 3. Fetch token Ids for sell & buy token on Batch Exchange
        uint16 sellTokenId = batchExchange.tokenAddressToIdMap(_sellToken);
        uint16 buyTokenId = batchExchange.tokenAddressToIdMap(_buyToken);

        // 4. Approve _sellToken to BatchExchange Contract
        _sellToken.safeIncreaseAllowance(address(batchExchange), _sellAmount);

        // 5. Deposit _sellAmount on BatchExchange
        try batchExchange.deposit(_sellToken, _sellAmount) {
        } catch {
            revert("ActionPlaceOrderBatchExchange.deposit _sellToken failed");
        }

        // 6. Place Order on Batch Exchange
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

        // 7. First check if we have a valid future withdraw request for the selltoken
        uint256 sellTokenWithdrawAmount = uint256(_sellAmount);
        try batchExchange.getPendingWithdraw(address(this), _sellToken)
            returns(uint256 reqWithdrawAmount, uint32 requestedBatchId)
        {
            // Check if the withdraw request is not in the past
            if (requestedBatchId >= uint32(block.timestamp / BATCH_TIME)) {
                // If we requested a max_uint withdraw, the withdraw amount will not change
                if (reqWithdrawAmount == MAX_UINT)
                    sellTokenWithdrawAmount = reqWithdrawAmount;
                // If not, we add the previous amount to the new one
                else
                    sellTokenWithdrawAmount = sellTokenWithdrawAmount.add(reqWithdrawAmount);
            }
        } catch {
            revert("ActionPlaceOrderBatchExchange.getPendingWithdraw _sellToken failed");
        }

        // 8. Request future withdraw on Batch Exchange for sellToken
        try batchExchange.requestFutureWithdraw(_sellToken, sellTokenWithdrawAmount, withdrawBatchId) {
        } catch {
            revert("ActionPlaceOrderBatchExchange.requestFutureWithdraw _sellToken failed");
        }

        // 9. Request future withdraw on Batch Exchange for buyToken
        // @DEV using MAX_UINT as we don't know in advance how much buyToken we will get
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
        (address origin,
         IERC20 buyToken,
         uint128 buyAmount,
         uint32 batchDuration) = _extractReusableActionData(_actionData);

        action(origin, sellToken, sellAmount, buyToken, buyAmount, batchDuration);
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
        (address origin,
         IERC20 sellToken,
         uint128 sellAmount,
         IERC20 buyToken,
         uint128 buyAmount,
         uint32 batchDuration) = abi.decode(
            _actionData[4:],
            (address,IERC20,uint128,IERC20,uint128,uint32)
        );
        action(origin, sellToken, sellAmount, buyToken, buyAmount, batchDuration);
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
        (address origin,
         IERC20 buyToken,
         uint128 buyAmount,
         uint32 batchDuration) = _extractReusableActionData(_actionData);

        action(origin, sellToken, sellAmount, buyToken, buyAmount, batchDuration);

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

        (address origin, IERC20 sellToken, uint128 sellAmount, IERC20 buyToken) = abi.decode(
            _actionData[4:132],
            (address,IERC20,uint128,IERC20)
        );

        if (origin == address(0) || origin == _userProxy) {
            try sellToken.balanceOf(_userProxy) returns(uint256 proxySendTokenBalance) {
                if (proxySendTokenBalance < sellAmount)
                    return "ActionPlaceOrderBatchExchange: NotOkUserProxySendTokenBalance";
            } catch {
                return "ActionPlaceOrderBatchExchange: ErrorBalanceOf-1";
            }
        } else {
            try sellToken.balanceOf(origin) returns(uint256 originSendTokenBalance) {
                if (originSendTokenBalance < sellAmount)
                    return "ActionPlaceOrderBatchExchange: NotOkOriginSendTokenBalance";
            } catch {
                return "ActionPlaceOrderBatchExchange: ErrorBalanceOf-2";
            }

            try sellToken.allowance(origin, _userProxy)
                returns(uint256 userProxySendTokenAllowance)
            {
                if (userProxySendTokenAllowance < sellAmount)
                    return "ActionPlaceOrderBatchExchange: NotOkUserProxySendTokenAllowance";
            } catch {
                return "ActionPlaceOrderBatchExchange: ErrorAllowance";
            }
        }

        uint32 currentBatchId = uint32(block.timestamp / BATCH_TIME);

        try batchExchange.getPendingWithdraw(_userProxy, sellToken)
            returns(uint256, uint32 requestedBatchId)
        {
            // Check if the withdraw request is valid => we need the withdraw to exec first
            if (requestedBatchId < currentBatchId) {
                return "ActionPlaceOrderBatchExchange WaitUntilPreviousBatchWasWithdrawn sellToken";
            }
        } catch {
            return "ActionPlaceOrderBatchExchange getPendinWithdraw failed sellToken";
        }

        try batchExchange.getPendingWithdraw(_userProxy, buyToken)
            returns(uint256, uint32 requestedBatchId)
        {
            // Check if the withdraw request is valid => we need the withdraw to exec first
            if (requestedBatchId < currentBatchId) {
                return "ActionPlaceOrderBatchExchange WaitUntilPreviousBatchWasWithdrawn buyToken";
            }
        } catch {
            return "ActionPlaceOrderBatchExchange getPendinWithdraw failed buyToken";
        }

        // STANDARD return string to signal actionConditions Ok
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
        returns (address origin, IERC20 buyToken, uint128 buyAmount, uint32 batchDuration)
    {
        (origin,/*sellToken*/,/*sellAmount*/, buyToken, buyAmount, batchDuration) = abi.decode(
            _actionData[4:],
            (address,IERC20,uint128,IERC20,uint128,uint32)
        );
    }
}