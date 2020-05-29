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

/// @title ActionPlaceOrderBatchExchange
/// @author Luis Schliesske & Hilmar Orth
/// @notice Gelato action that 1) withdraws funds form user's  EOA, 2) deposits on Batch Exchange, 3) Places order on batch exchange and 4) requests future withdraw on batch exchange
contract ActionPlaceOrderBatchExchange is GelatoActionsStandard {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    uint256 public constant MAX_UINT = uint256(-1);
    uint32 public constant BATCH_TIME = 300;

    IBatchExchange private immutable batchExchange;
    address public immutable myself;

    constructor(IBatchExchange _batchExchange) public {
        batchExchange = _batchExchange;
        myself = address(this);
    }

    /// @notice Place order on Batch Exchange and request future withdraw for buy and sell token
    /// @param _sellToken Token to sell on Batch Exchange
    /// @param _buyToken Token to buy on Batch Exchange
    /// @param _sellAmount Amount to sell
    /// @param _buyAmount Amount to receive (at least)
    /// @param _batchDuration After how many batches funds should be
    function action(
        address _sellToken,
        uint128 _sellAmount,
        address _buyToken,
        uint128 _buyAmount,
        uint32 _batchDuration,
        bool
    )
        public
        virtual
    {

        IERC20 sellToken = IERC20(_sellToken);

        // 1. Fetch token Ids for sell & buy token on Batch Exchange
        uint16 sellTokenId = batchExchange.tokenAddressToIdMap(_sellToken);
        uint16 buyTokenId = batchExchange.tokenAddressToIdMap(_buyToken);

        // 2. Approve sellToken to BatchExchange Contract
        sellToken.safeIncreaseAllowance(address(batchExchange), _sellAmount);

        // 3. Deposit _sellAmount on BatchExchange
        try batchExchange.deposit(_sellToken, _sellAmount) {}
        catch {
            revert("batchExchange.deposit _sellToken failed");
        }

        // Get current batch id
        uint32 withdrawBatchId = uint32(block.timestamp / BATCH_TIME) + _batchDuration;

        // 4. Place Order on Batch Exchange
        // uint16 buyToken, uint16 sellToken, uint32 validUntil, uint128 buyAmount, uint128 _sellAmount
        try batchExchange.placeOrder(buyTokenId, sellTokenId, withdrawBatchId, _buyAmount, _sellAmount) {}
        catch {
            revert("batchExchange.placeOrderfailed");
        }

        // 5. Request future withdraw on Batch Exchange for sellToken
        // requestFutureWithdraw(address token, uint256 amount, uint32 batchId)
        try batchExchange.requestFutureWithdraw(_sellToken, _sellAmount, withdrawBatchId) {}
        catch {
            revert("batchExchange.requestFutureWithdraw _sellToken failed");
        }

        // 6. Request future withdraw on Batch Exchange for sellToken
        // @DEV using MAX_UINT as we don't know in advance how much buyToken we will get
        // requestFutureWithdraw(address token, uint256 amount, uint32 batchId)
        try batchExchange.requestFutureWithdraw(_buyToken, MAX_UINT, withdrawBatchId) {}
        catch {
            revert("batchExchange.requestFutureWithdraw _buyToken failed");
        }
    }

    // Will be automatically called by gelato => do not use for encoding
    function gelatoInternal(
        bytes calldata _actionData,
        bytes calldata _taskState
    )
        external
        virtual
        override
        returns(ReturnType, bytes memory)
    {
        // 1. Decode _actionData
        (address _sellToken,
        uint128 _sellAmount,
        address _buyToken,
        uint128 _buyAmount,
        uint32 _batchDuration, bool returnsTaskState) = abi.decode(_actionData[4:], (address, uint128, address, uint128, uint32, bool));


        // 2. Check if taskState exists
        if (_taskState.length != 0) {
            uint256 sellAmount256;

            (ReturnType returnType, bytes memory returnBytes) = abi.decode(_taskState, (ReturnType, bytes));

            if (returnType == ReturnType.UINT) {
                (sellAmount256) = abi.decode(returnBytes, (uint256));
                _sellAmount = uint128(sellAmount256);
                require (_sellAmount == sellAmount256, "Uint256 to uint128 conversion overflowed");
            } else if (returnType == ReturnType.UINT_AND_ERC20) {
                (sellAmount256, _sellToken) = abi.decode(returnBytes, (uint256, address));
                _sellAmount = uint128(sellAmount256);
                require (_sellAmount == sellAmount256, "Uint256 to uint128 conversion overflowed");
            }
        }

        // 3. Call action
        action(_sellToken, _sellAmount, _buyToken, _buyAmount, _batchDuration, returnsTaskState);

        return(returnsTaskState ? ReturnType.UINT : ReturnType.NONE, abi.encode(uint256(_sellAmount)));
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
        (address _sellToken, uint128 _sellAmount, /* address _buyToken */ , /* uint128 _buyAmount */, /* uint32 _batchDuration */, /*, bool returnsTaskState*/) = abi.decode(
            _actionData[4:],
            (
                address,
                uint128,
                address,
                uint128,
                uint32,
                bool
            )
        );
        return _actionProviderTermsCheck(_userProxy, _sellToken, _sellAmount);
    }

    /// @notice Verify that EOA has sufficient balance and gave proxy adequate allowance
    /// @param _userProxy Users Proxy address
    /// @param _sellToken Token to sell on Batch Exchange
    /// @param _sellAmount Amount to sell
    function _actionProviderTermsCheck(
        address _userProxy, address _sellToken, uint128 _sellAmount
    )
        internal
        view
        virtual
        returns(string memory)  // actionCondition
    {
        IERC20 sendERC20 = IERC20(_sellToken);
        try sendERC20.balanceOf(_userProxy) returns(uint256 sendERC20Balance) {
            if (sendERC20Balance < _sellAmount)
                return "ActionPlaceOrderBatchExchange: NotOkUserSendTokenBalance";
        } catch {
            return "ActionPlaceOrderBatchExchange: ErrorBalanceOf";
        }

        // STANDARD return string to signal actionConditions Ok
        return "OK";
    }


}