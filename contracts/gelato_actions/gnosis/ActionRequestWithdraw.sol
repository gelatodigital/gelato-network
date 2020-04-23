pragma solidity ^0.6.5;
pragma experimental ABIEncoderV2;

import { GelatoActionsStandard } from "../GelatoActionsStandard.sol";
import { IGelatoAction } from "../IGelatoAction.sol";
import { IERC20 } from "../../external/IERC20.sol";
import { SafeERC20 } from "../../external/SafeERC20.sol";
import { SafeMath } from "../../external/SafeMath.sol";
import { Math } from "../../external/Math.sol";
import { Order, IBatchExchange } from "../../dapp_interfaces/gnosis/IBatchExchange.sol";
import { Task, IGelatoCore } from "../../gelato_core/interfaces/IGelatoCore.sol";


contract ActionRequestWithdraw is GelatoActionsStandard {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    uint256 public constant MAX_UINT = uint256(-1);

    IBatchExchange private immutable batchExchange;

    constructor(address _batchExchange) public {
        batchExchange = IBatchExchange(_batchExchange);
    }

    function action(bytes calldata _actionData) external payable override virtual {
        (address _sellToken, address _buyToken, uint32 _orderExpirationBatchId, address _gelatoCore, Task memory _task) = abi.decode(_actionData, (address, address, uint32, address, Task));
        action(_sellToken, _buyToken, _orderExpirationBatchId, _gelatoCore, _task);
    }

    // Request Withdraw based on previous uint32 validUntil
    function action(
        address _sellToken,
        address _buyToken,
        uint32 _orderExpirationBatchId,
        address _gelatoCore,
        Task memory _task
    )
        public
        virtual
    {

        // 1. Compute how much we can withdraw from both sell - and buyToken
        Order[] memory proxyOrders = batchExchange.orders(address(this));
        Order memory proxyOrder = proxyOrders[_orderExpirationBatchId];

        uint128 sellTokenWithdrawAmount =  proxyOrder.priceDenominator - proxyOrder.usedAmount;
        uint128 buyTokenWithdrawAmount;
        if (proxyOrder.usedAmount > 0) buyTokenWithdrawAmount = proxyOrder.usedAmount * proxyOrder.priceNumerator / proxyOrder.priceDenominator;

        // 2. Request Withdraw in next batch
        try batchExchange.requestWithdraw(_sellToken, sellTokenWithdrawAmount) {}
        catch {
            revert("batchExchange.requestWithdraw _sellToken failed");
        }
        try batchExchange.requestWithdraw(_buyToken, buyTokenWithdrawAmount) {}
        catch {
            revert("batchExchange.requestWithdraw _buyToken failed");
        }

        // 3. Submit gelato execClaim for withdraw
        try IGelatoCore(_gelatoCore).submitTask(_task) {
        } catch {
            revert("Submitting chainedClaim unsuccessful");
        }

    }

    // ======= ACTION CONDITIONS CHECK =========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(bytes calldata _actionData)
        external
        view
        override
        virtual
        returns(string memory)  // actionCondition
    {
        (,,uint32 _orderExpirationBatchId,,) = abi.decode(_actionData, (address, address, uint32, address, Task));
        return _actionConditionsCheck(_orderExpirationBatchId);
    }

    function _actionConditionsCheck(
        uint32 _orderExpirationBatchId
    )
        internal
        view
        virtual
        returns(string memory)  // actionCondition
    {
        uint32 currentBatchId = batchExchange.getCurrentBatchId();

        if (currentBatchId < _orderExpirationBatchId) {
            return "ActionRequestWithdraw: Not ready to make withdraw request";
        }

        return "Ok";
    }



}