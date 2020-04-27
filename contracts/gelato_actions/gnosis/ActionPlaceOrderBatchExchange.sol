pragma solidity ^0.6.5;

import { GelatoActionsStandard } from "../GelatoActionsStandard.sol";
import { IGelatoAction } from "../IGelatoAction.sol";
import { IERC20 } from "../../external/IERC20.sol";
import { SafeERC20 } from "../../external/SafeERC20.sol";
import { SafeMath } from "../../external/SafeMath.sol";
import { IBatchExchange } from "../../dapp_interfaces/gnosis/IBatchExchange.sol";


/// @title ActionPlaceOrderBatchExchange
/// @author Luis Schliesske & Hilmar Orth
/// @notice Gelato action that 1) withdraws funds form user's  EOA, 2) deposits on Batch Exchange, 3) Places order on batch exchange and 4) requests future withdraw on batch exchange

contract ActionPlaceOrderBatchExchange  {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    uint256 public constant MAX_UINT = uint256(-1);

    IBatchExchange private immutable batchExchange;

    constructor(address _batchExchange) public {
        batchExchange = IBatchExchange(_batchExchange);
    }

    /// @notice Place order on Batch Exchange and request future withdraw for buy and sell token
    /// @param _user Users EOA address
    /// @param _userProxy Users Proxy address
    /// @param _sellToken Token to sell on Batch Exchange
    /// @param _buyToken Token to buy on Batch Exchange
    /// @param _sellAmount Amount to sell
    /// @param _buyAmount Amount to receive (at least)
    /// @param _orderExpirationBatchId Expiration batch id of order and id used to request withdrawals for
    function action(
        address _user,
        address _userProxy,
        address _sellToken,
        address _buyToken,
        uint128 _sellAmount,
        uint128 _buyAmount,
        uint32 _orderExpirationBatchId
    )
        public
        virtual
    {
        require(address(this) == _userProxy, "ActionPlaceOrderBatchExchange.action: Must be correct user proxy");

        /*
        - [ ] a) transferFrom an ERC20 from the proxies owner account to the proxy,
        - [ ] b) calls ‘deposit’  token in EpochTokenLocker contract
        - [ ] c) calls ‘placeOrder’ in BatchExchange contract, inputting valid until 3 auctions from current one
        - [ ] d) calls ‘requestFutureWithdraw’ with batch id of the n + 3 and amount arbitrary high (higher than expected output) contract in EpochTokenLocker
        - [ ] e) submits a task on gelato with condition = address(0) and action “withdraw()” in EpochTokenLocker contract
        */

        // 1. Transfer sellToken to proxy
        IERC20 sellToken = IERC20(_sellToken);
        sellToken.safeTransferFrom(_user, _userProxy, _sellAmount);

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

    // ======= ACTION CONDITIONS CHECK =========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(bytes calldata _actionData)
        external
        view
        virtual
        returns(string memory)  // actionCondition
    {
        (address _user, address _userProxy, address _sellToken, , uint128 _sellAmount, ,) = abi.decode(_actionData, (address, address, address, address, uint128, uint128, uint32));
        return _actionProviderTermsCheck(_user, _userProxy, _sellToken, _sellAmount);
    }

    /// @notice Verify that EOA has sufficinet balance and gave proxy adequate allowance
    /// @param _user Users EOA address
    /// @param _userProxy Users Proxy address
    /// @param _sellToken Token to sell on Batch Exchange
    /// @param _sellAmount Amount to sell
    function _actionProviderTermsCheck(
        address _user, address _userProxy, address _sellToken, uint128 _sellAmount
    )
        internal
        view
        virtual
        returns(string memory)  // actionCondition
    {
        IERC20 sendERC20 = IERC20(_sellToken);
        try sendERC20.balanceOf(_user) returns(uint256 sendERC20Balance) {
            if (sendERC20Balance < _sellAmount)
                return "ActionPlaceOrderBatchExchange: NotOkUserSendTokenBalance";
        } catch {
            return "ActionPlaceOrderBatchExchange: ErrorBalanceOf";
        }
        try sendERC20.allowance(_user, _userProxy)
            returns(uint256 userProxySendTokenAllowance)
        {
            if (userProxySendTokenAllowance < _sellAmount)
                return "ActionPlaceOrderBatchExchange: NotOkUserProxySendTokenAllowance";
        } catch {
            return "ActionPlaceOrderBatchExchange: ErrorAllowance";
        }

        // STANDARD return string to signal actionConditions Ok
        return "OK";
    }


}