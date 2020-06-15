// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import {ActionPlaceOrderBatchExchange} from "./ActionPlaceOrderBatchExchange.sol";
import {DataFlow} from "../../gelato_core/interfaces/IGelatoCore.sol";
import {SafeERC20} from "../../external/SafeERC20.sol";
import {SafeMath} from "../../external/SafeMath.sol";
import {IBatchExchange} from "../../dapp_interfaces/gnosis/IBatchExchange.sol";
import {Task} from "../../gelato_core/interfaces/IGelatoCore.sol";
import {IKyberNetworkProxy} from "../../dapp_interfaces/kyber/IKyberNetworkProxy.sol";

/// @title ActionPlaceOrderBatchExchangeWithSlippage
/// @author Luis Schliesske & Hilmar Orth
/// @notice Gelato Action that
///  1) Calculates buyAmout based on inputted slippage value,
///  2) withdraws funds form user's  EOA,
///  3) deposits on Batch Exchange,
///  4) Places order on batch exchange and
//   5) requests future withdraw on batch exchange
contract ActionPlaceOrderBatchExchangeWithSlippage is ActionPlaceOrderBatchExchange {

    using SafeMath for uint256;
    using SafeERC20 for address;

    IKyberNetworkProxy public immutable KYBER;

    constructor(
        IBatchExchange _batchExchange,
        IKyberNetworkProxy _kyberNetworkProxy
    )
        ActionPlaceOrderBatchExchange(_batchExchange)
        public
    {
        KYBER = _kyberNetworkProxy;
    }

    /// @dev use this function to encode the data off-chain for the action data field
    /// Use "address _sellToken" and "address _buyToken" for Human Readable ABI.
    function getActionData(
        address _origin,
        address _sellToken,
        uint128 _sellAmount,
        address _buyToken,
        uint128 _buySlippage,
        uint32 _batchDuration
    )
        public
        pure
        virtual
        override
        returns(bytes memory)
    {
        return abi.encodeWithSelector(
            this.action.selector,
            _origin,
            _sellToken,
            _sellAmount,
            _buyToken,
            _buySlippage,
            _batchDuration
        );
    }

    /// @notice Place order on Batch Exchange and request future withdraw for buy/sell token
    /// @dev Use "address _sellToken" and "address _buyToken" for Human Readable ABI.
    /// @param _sellToken Token to sell on Batch Exchange
    /// @param _sellAmount Amount to sell
    /// @param _buyToken Token to buy on Batch Exchange
    /// @param _buySlippage Slippage inlcuded for the buySlippage in order placement
    /// @param _batchDuration After how many batches funds should be
    function action(
        address _origin,
        address _sellToken,
        uint128 _sellAmount,
        address _buyToken,
        uint128 _buySlippage,
        uint32 _batchDuration
    )
        public
        virtual
        override
        delegatecallOnly("ActionPlaceOrderBatchExchangeWithSlippage.action")
    {
        uint128 expectedBuyAmount = getKyberBuyAmountWithSlippage(
            _sellToken,
            _buyToken,
            _sellAmount,
            _buySlippage
        );
        super.action(
            _origin, _sellToken, _sellAmount, _buyToken, expectedBuyAmount, _batchDuration
        );
    }

    function getKyberBuyAmountWithSlippage(
        address _sellToken,
        address _buyToken,
        uint128 _sellAmount,
        uint256 _slippage
    )
        view
        public
        returns(uint128 expectedBuyAmount128)
    {
        uint256 sellTokenDecimals = getDecimals(_sellToken);
        uint256 buyTokenDecimals = getDecimals(_buyToken);

        try KYBER.getExpectedRate(address(_sellToken), address(_buyToken), _sellAmount)
            returns(uint256 expectedRate, uint256)
        {
            // Returned values in kyber are in 18 decimals
            // regardless of the destination token's decimals
            uint256 expectedBuyAmount256 = expectedRate
                // * sellAmount, as kyber returns the price for 1 unit
                .mul(_sellAmount)
                // * buy decimal tokens, to convert expectedRate * sellAmount to buyToken decimals
                .mul(10 ** buyTokenDecimals)
                // / sell token decimals to account for sell token decimals of _sellAmount
                .div(10 ** sellTokenDecimals)
                // / 10**18 to account for kyber always returning with 18 decimals
                .div(1e18);

            // return amount minus slippage. e.g. _slippage = 5 => 5% slippage
            expectedBuyAmount256
                = expectedBuyAmount256 - expectedBuyAmount256.mul(_slippage).div(100);
            expectedBuyAmount128 = uint128(expectedBuyAmount256);
            require(
                expectedBuyAmount128 == expectedBuyAmount256,
                "ActionPlaceOrderBatchExchangeWithSlippage.getKyberRate: uint conversion"
            );
        } catch {
            revert("ActionPlaceOrderBatchExchangeWithSlippage.getKyberRate:Error");
        }
    }

    function getDecimals(address _token)
        internal
        view
        returns(uint256)
    {
        (bool success, bytes memory data) = _token.staticcall{gas: 30000}(
            abi.encodeWithSignature("decimals()")
        );

        if (!success) {
            (success, data) = _token.staticcall{gas: 30000}(
                abi.encodeWithSignature("DECIMALS()")
            );
        }
        if (success) return abi.decode(data, (uint256));
        else revert("ActionPlaceOrderBatchExchangeWithSlippage.getDecimals:revert");
    }

    /// @dev Will be called by GelatoActionPipeline if Action.dataFlow.In
    //  => do not use for _actionData encoding
    function execWithDataFlowIn(bytes calldata _actionData, bytes calldata _inFlowData)
        external
        payable
        virtual
        override
    {
        (address sellToken, uint128 sellAmount) = _handleInFlowData(_inFlowData);
        (address origin,
         address buyToken,
         uint128 buySlippage,
         uint32 batchDuration) = _extractReusableActionData(_actionData);

        action(origin, sellToken, sellAmount, buyToken, buySlippage, batchDuration);
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
         address sellToken,
         uint128 sellAmount,
         address buyToken,
         uint128 buySlippage,
         uint32 batchDuration) = abi.decode(
            _actionData[4:],
            (address,address,uint128,address,uint128,uint32)
        );
        action(origin, sellToken, sellAmount, buyToken, buySlippage, batchDuration);
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
        (address sellToken, uint128 sellAmount) = _handleInFlowData(_inFlowData);
        (address origin,
         address buyToken,
         uint128 buySlippage,
         uint32 batchDuration) = _extractReusableActionData(_actionData);

        action(origin, sellToken, sellAmount, buyToken, buySlippage, batchDuration);

        return abi.encode(sellToken, sellAmount);
    }

    // ======= ACTION HELPERS =========
    function _handleInFlowData(bytes calldata _inFlowData)
        internal
        pure
        virtual
        override
        returns(address sellToken, uint128 sellAmount)
    {
        uint256 sellAmount256;
        (sellToken, sellAmount256) = abi.decode(_inFlowData, (address,uint256));
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
        override
        returns (address origin, address buyToken, uint128 buySlippage, uint32 batchDuration)
    {
        (origin,/*sellToken*/,/*sellAmount*/, buyToken, buySlippage, batchDuration) = abi.decode(
            _actionData[4:],
            (address,address,uint128,address,uint128,uint32)
        );
    }
}