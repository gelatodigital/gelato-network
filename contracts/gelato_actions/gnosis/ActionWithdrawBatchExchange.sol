pragma solidity ^0.6.5;

import { GelatoActionsStandard } from "../GelatoActionsStandard.sol";
import { IGelatoAction } from "../IGelatoAction.sol";
import { IERC20 } from "../../external/IERC20.sol";
import { IBatchExchange } from "../../dapp_interfaces/gnosis/IBatchExchange.sol";
import { IMedianizer } from "../../dapp_interfaces/maker/IMakerMedianizer.sol";
import { FeeExtractor } from "../../gelato_helpers/FeeExtractor.sol";
import { SafeERC20 } from "../../external/SafeERC20.sol";
import { SafeMath } from "../../external/SafeMath.sol";


/// @title ActionWithdrawBatchExchange
/// @author Luis Schliesske & Hilmar Orth
/// @notice Gelato action that 1) withdraws funds from Batch Exchange and 2) sends funds back to users EOA (minus fee)
contract ActionWithdrawBatchExchange is GelatoActionsStandard {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // BatchExchange
    IBatchExchange public immutable batchExchange;

    // Fee finder
    FeeExtractor public immutable feeExtractor;

    constructor(address _batchExchange, address _feeExtractor) public {
        batchExchange = IBatchExchange(_batchExchange);
        feeExtractor = FeeExtractor(_feeExtractor);
    }

    /// @notice Withdraw sell and buy token from Batch Exchange and send funds back to _user EOA
    /// @param _sellToken Token to sell on Batch Exchange
    /// @param _buyToken Token to buy on Batch Exchange
    function action(
        address _sellToken,
        address _buyToken
    )
        public
        virtual
    {

        // 3. Withdraw buy token and pay provider fee (if possible)
        try batchExchange.withdraw(address(this), _buyToken) {}
        catch {
           // Do not revert, as order might not have been fulfilled.
           revert("ActionWithdrawBatchExchange.withdraw _buyToken failed");
        }

        // 5. Withdraw sell token and pay fee (if not paid already)
        try batchExchange.withdraw(address(this), _sellToken) {}
        catch {
            // Do not revert, as order might have been filled completely
            revert("ActionWithdrawBatchExchange.withdraw _sellToken failed");
        }

    }

    // ======= ACTION CONDITIONS CHECK =========
    // Overriding and extending GelatoActionsStandard's function (optional)
    function termsOk(bytes calldata _actionData, address _userProxy)
        external
        view
        override
        virtual
        returns(string memory)  // actionCondition
    {
        (address _sellToken, address _buyToken) = abi.decode(
            _actionData[4:],
            (address,address)
        );
        return _actionConditionsCheck(
            _userProxy, _sellToken, _buyToken
        );
    }

    /// @notice Verify that _userProxy has two valid withdraw request on batch exchange (for buy and sell token)
    /// @param _userProxy Users Proxy address
    /// @param _sellToken Token to sell on Batch Exchange
    /// @param _buyToken Amount to sell
    function _actionConditionsCheck(
        address _userProxy,
        address _sellToken,
        address _buyToken
    )
        internal
        view
        virtual
        returns(string memory)  // actionCondition
    {

        bool sellTokenWithdrawable = batchExchange.hasValidWithdrawRequest(_userProxy, _sellToken);

        if (!sellTokenWithdrawable) {
            return "ActionWithdrawBatchExchange: Sell Token not withdrawable yet";
        }

        bool buyTokenWithdrawable = batchExchange.hasValidWithdrawRequest(_userProxy, _buyToken);

        if (!buyTokenWithdrawable) {
            return "ActionWithdrawBatchExchange: Buy Token not withdrawable yet";
        }

        bool proxyHasCredit = feeExtractor.proxyHasCredit(_userProxy);

        if (!proxyHasCredit) {
            return "ActionWithdrawBatchExchange: Proxy has insufficient credit";
        }

        return OK;

    }

    function getDecimals(address _token)
        internal
        view
        returns(uint256)
    {
        (bool success, bytes memory data) = address(_token).staticcall{gas: 20000}(
            abi.encodeWithSignature("decimals()")
        );

        if (!success) {
            (success, data) = address(_token).staticcall{gas: 20000}(
                abi.encodeWithSignature("DECIMALS()")
            );
        }

        if (success) {
            return abi.decode(data, (uint256));
        } else {
            revert("ActionWithdrawBatchExchange.getDecimals no decimals found");
        }
    }
}