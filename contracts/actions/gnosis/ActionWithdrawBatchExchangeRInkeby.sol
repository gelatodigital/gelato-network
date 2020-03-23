pragma solidity ^0.6.3;

import "../GelatoActionsStandard.sol";
import "../../external/IERC20.sol";
import "../../external/SafeERC20.sol";
import "../../external/SafeMath.sol";
import "../../dapp_interfaces/gnosis/IBatchExchange.sol";

contract ActionWithdrawBatchExchangeRinkeby is GelatoActionsStandard {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    uint256 public constant MAX_UINT = uint256(-1);

    // $3 FEe
    uint256 public constant FEE_USD = 3;

    IBatchExchange public constant batchExchange = IBatchExchange(0xC576eA7bd102F7E476368a5E98FA455d1Ea34dE2);

    // actionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() public pure override virtual returns(bytes4) {
        return this.withdrawFromBatchExchange.selector;
    }

    function withdrawFromBatchExchange(
        address _user,
        address _sellToken,
        address _buyToken
    )
        public
        virtual
    {

        // bool paid;

        // 1. Fetch sellToken Balance
        IERC20 sellToken = IERC20(_sellToken);
        uint256 preSellTokenBalance = sellToken.balanceOf(address(this));

        // 2. Fetch buyToken Balance
        IERC20 buyToken = IERC20(_buyToken);
        uint256 preBuyTokenBalance = buyToken.balanceOf(address(this));

        // 3. Withdraw buy token
        try batchExchange.withdraw(_user, _buyToken) {
            uint256 postBuyTokenBalance = buyToken.balanceOf(address(this));
            uint256 buyTokenWithdrawAmount = postBuyTokenBalance.sub(preBuyTokenBalance);

            // 4. Send buyToken to user
            if (buyTokenWithdrawAmount > 0) buyToken.safeTransfer(_user, buyTokenWithdrawAmount);
        }
        catch {
           // Do not revert, as order might not have been fulfilled.
           // revert("batchExchange.withdraw _buyToken failed");
        }

        // 5. Withdraw sell token
        try batchExchange.withdraw(_user, _sellToken) {
            uint256 postSellTokenBalance = sellToken.balanceOf(address(this));
            uint256 sellTokenWithdrawAmount = postSellTokenBalance.sub(preSellTokenBalance);

            // 6. Send sellToken to user
            if (sellTokenWithdrawAmount > 0) {
                // uint256 decimals = getDecimals(_sellToken);
                // uint256 feeToProvider = FEE_USD.mul(10**decimals);

                sellToken.safeTransfer(_user, sellTokenWithdrawAmount);
            }
        }
        catch {
            // Do not revert, as order might have been filled completely
            // revert("batchExchange.withdraw _sellToken failed");
        }

    }

    // ======= ACTION CONDITIONS CHECK =========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function actionConditionsCheck(bytes calldata _actionPayload)
        external
        view
        override
        virtual
        returns(string memory)  // actionCondition
    {
        (address _user, address _sellToken, address _buyToken) = abi.decode(
            _actionPayload[4:],
            (address,address,address)
        );
        return _actionConditionsCheck(
            _user, _sellToken, _buyToken
        );
    }

    function _actionConditionsCheck(
        address _user,
        address _sellToken,
        address _buyToken
    )
        internal
        view
        virtual
        returns(string memory)  // actionCondition
    {
        // uint32 currentBatchId = batchExchange.getCurrentBatchId();
        // if (_batchIdEnablingWithdraw < currentBatchId) {
        //     return "ok";
        // } else {
        //     return "ActionWithdrawBatchExchangeRinkeby: Not withdrawable yet";
        // }

        // @ DEV: Problem, as we dont have a way to on-chain check if there are actually funds that can be withdrawn, the business model relies on the assumption that sufficient funds are availabe to be withdrawn in order to compensate the executor

        bool sellTokenWithdrawable = batchExchange.hasValidWithdrawRequest(_user, _sellToken);

        if (!sellTokenWithdrawable) {
            return "ActionWithdrawBatchExchangeRinkeby: Sell Token not withdrawable yet";
        }

        bool buyTokenWithdrawable = batchExchange.hasValidWithdrawRequest(_user, _buyToken);

        if (!buyTokenWithdrawable) {
            return "ActionWithdrawBatchExchangeRinkeby: Buy Token not withdrawable yet";
        }

        return "ok";

    }

    function getDecimals(address _token)
        internal
        view
        returns(uint256)
    {
        (bool success, bytes memory data) = address(_token).staticcall{gas: 10000}(
            abi.encodeWithSignature("decimals()")
        );

        if (!success) {
            (success, data) = address(_token).staticcall{gas: 10000}(
                abi.encodeWithSignature("DECIMALS()")
            );
        }

        return success ? abi.decode(data, (uint256)) : 18;

    }



}