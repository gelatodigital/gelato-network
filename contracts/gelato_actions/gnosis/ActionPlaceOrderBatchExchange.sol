pragma solidity ^0.6.3;

import { GelatoActionsStandard } from "../GelatoActionsStandard.sol";
import { IGelatoAction } from "../IGelatoAction.sol";
import { IERC20 } from "../../external/IERC20.sol";
import { SafeERC20 } from "../../external/SafeERC20.sol";
import { SafeMath } from "../../external/SafeMath.sol";
import { IBatchExchange } from "../../dapp_interfaces/gnosis/IBatchExchange.sol";

contract ActionPlaceOrderBatchExchange is GelatoActionsStandard {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    uint256 public constant MAX_UINT = uint256(-1);

    IBatchExchange private constant batchExchange = IBatchExchange(0xC576eA7bd102F7E476368a5E98FA455d1Ea34dE2);

    function action(bytes calldata _actionPayload) external payable override virtual {
        (address _user, address _sellToken, address _buyToken, uint128 _sellAmount, uint128 _buyAmount, uint32 _orderExpirationBatchId) = abi.decode(_actionPayload[4:], (address, address, address, uint128, uint128, uint32));
        action(_user, _sellToken, _buyToken, _sellAmount, _buyAmount, _orderExpirationBatchId);
    }

    function action(
        address _user,
        address _sellToken,
        address _buyToken,
        uint128 _sellAmount,
        uint128 _buyAmount,
        uint32 _orderExpirationBatchId
    )
        public
        virtual
    {

        /*
        - [ ] b) transferFrom an ERC20 from the proxies owner account to the proxy,
        - [ ] c) calls ‘deposit’  token in EpochTokenLocker contract
        - [ ] d) calls ‘placeOrder’ in BatchExchange contract, inputting valid until 3 auctions from current one
        - [ ] e) calls ‘requestFutureWithdraw’ with batch id of the n + 3 and amount arbitrary high (higher than expected output) contract in EpochTokenLocker
        - [ ] d) mints an execution claim on gelato with condition = address(0) and action “withdraw()” in EpochTokenLocker contract
        */

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

        // 5. Place Order on Batch Exchange
        // uint16 buyToken, uint16 sellToken, uint32 validUntil, uint128 buyAmount, uint128 sellAmount
        try batchExchange.placeOrder(buyTokenId, sellTokenId, _orderExpirationBatchId, _buyAmount, _sellAmount) {}
        catch {
            revert("batchExchange.placeOrderfailed");
        }

        // 6. Request future withdraw on Batch Exchange for sellToken
        // requestFutureWithdraw(address token, uint256 amount, uint32 batchId)
        try batchExchange.requestFutureWithdraw(_sellToken, _sellAmount, _orderExpirationBatchId) {}
        catch {
            revert("batchExchange.requestFutureWithdraw _sellToken failed");
        }

        // 7. Request future withdraw on Batch Exchange for sellToken
        // @DEV using MAX_UINT as we don't know in advance how much buyToken we will get
        // requestFutureWithdraw(address token, uint256 amount, uint32 batchId)
        try batchExchange.requestFutureWithdraw(_buyToken, MAX_UINT, _orderExpirationBatchId) {}
        catch {
            revert("batchExchange.requestFutureWithdraw _buyToken failed");
        }

    }


}