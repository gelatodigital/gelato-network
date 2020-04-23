pragma solidity ^0.6.5;

import { GelatoActionsStandard } from "../GelatoActionsStandard.sol";
import { IGelatoAction } from "../IGelatoAction.sol";
import { IERC20 } from "../../external/IERC20.sol";
import { SafeERC20 } from "../../external/SafeERC20.sol";
import { SafeMath } from "../../external/SafeMath.sol";
import { IBatchExchange } from "../../dapp_interfaces/gnosis/IBatchExchange.sol";
import { IMedianizer } from "../../dapp_interfaces/maker/IMakerMedianizer.sol";


/// @title ActionWithdrawBatchExchangeWithMaker
/// @author Luis Schliesske & Hilmar Orth
/// @notice Gelato action that 1) withdraws funds from Batch Exchange and 2) sends funds back to users EOA (minus fee)
contract ActionWithdrawBatchExchangeWithMaker is GelatoActionsStandard {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // $3 FEE
    uint256 public constant FEE_USD = 3;

    // Gelato Provider // Pays execution cost and receives fee in return
    address private immutable gelatoProvider;

    // BatchExchange
    IBatchExchange private immutable batchExchange;

    // Maker Medianizer for WETH Exchange Rate
    IMedianizer private immutable medianizer;

    // WETH RINKEBY
    address private immutable WETH;

    constructor(address _batchExchange, address _weth, address _gelatoProvider, address _medianizer) public {
        batchExchange = IBatchExchange(_batchExchange);
        WETH = _weth;
        gelatoProvider = _gelatoProvider;
        medianizer = IMedianizer(_medianizer);
    }


    function action(bytes calldata _actionData) external payable override virtual {
        (address _user, address _userProxy, address _sellToken, address _buyToken) = abi.decode(_actionData, (address, address, address, address));
        action(_user, _userProxy, _sellToken, _buyToken);
    }

    /// @notice Withdraw sell and buy token from Batch Exchange and send funds back to _user EOA
    /// @param _user Users EOA address
    /// @param _userProxy Users Proxy address
    /// @param _sellToken Token to sell on Batch Exchange
    /// @param _buyToken Token to buy on Batch Exchange
    function action(
        address _user,
        address _userProxy,
        address _sellToken,
        address _buyToken
    )
        public
        virtual
    {

        bool paid;

        // 1. Fetch sellToken Balance
        IERC20 sellToken = IERC20(_sellToken);
        uint256 preSellTokenBalance = sellToken.balanceOf(_userProxy);

        // 2. Fetch buyToken Balance
        IERC20 buyToken = IERC20(_buyToken);
        uint256 preBuyTokenBalance = buyToken.balanceOf(_userProxy);

        // 3. Withdraw buy token and pay provider fee (if possible)
        try batchExchange.withdraw(_userProxy, _buyToken) {
            uint256 postBuyTokenBalance = buyToken.balanceOf(_userProxy);
            uint256 buyTokenWithdrawAmount = postBuyTokenBalance.sub(preBuyTokenBalance);

            // 4. Check if buy tokens got withdrawn
            if (buyTokenWithdrawAmount > 0) {

                uint256 fee;
                // If _buyToken is WETH
                if (_buyToken == WETH) {
                    fee = getEthFee();
                } else {
                    uint256 buyTokenDecimals = getDecimals(_buyToken);
                    fee = FEE_USD * 10 ** buyTokenDecimals;
                }


                // If enough buyToken got withdrawn, pay fee & pay rest to _user
                // Else, transfer buy tokens to user, we will pay fee with _sellToken
                if (fee <= buyTokenWithdrawAmount) {
                    buyToken.safeTransfer(gelatoProvider, fee);
                    buyToken.safeTransfer(_user, buyTokenWithdrawAmount - fee);
                    paid = true;

                } else {
                    buyToken.safeTransfer(_user, buyTokenWithdrawAmount);
                }
            }
        }
        catch {
           // Do not revert, as order might not have been fulfilled.
           revert("ActionWithdrawBatchExchangeWithMaker.withdraw _buyToken failed");
        }

        // 5. Withdraw sell token and pay fee (if not paid already)
        try batchExchange.withdraw(_userProxy, _sellToken) {
            uint256 postSellTokenBalance = sellToken.balanceOf(_userProxy);
            uint256 sellTokenWithdrawAmount = postSellTokenBalance.sub(preSellTokenBalance);

            // 6. Check if buy tokens got withdrawn
            if (sellTokenWithdrawAmount > 0) {

                // If user did not pay fee with _buyToken, pay with _sellToken
                // Else if fee was paid, pay out rest to _user
                if (!paid) {

                    // Calculate fee
                    uint256 fee;
                    // If _buyToken is WETH
                    if (_sellToken == WETH) {
                        fee = getEthFee();
                    } else {
                        uint256 sellTokenDecimals = getDecimals(_sellToken);
                        fee = FEE_USD * 10 ** sellTokenDecimals;
                    }

                    // If enough sellToken got withdrawn, pay fee & pay rest to _user
                    // Else, revert as user does not have sufficient funds to pay provider
                    if (fee <= sellTokenWithdrawAmount) {
                        sellToken.safeTransfer(gelatoProvider, fee);
                        sellToken.safeTransfer(_user, sellTokenWithdrawAmount - fee);

                    } else {
                        revert("ActionWithdrawBatchExchangeWithMaker: Insufficient balance for user to pay for withdrawal 1");
                    }

                } else {
                    sellToken.safeTransfer(_user, sellTokenWithdrawAmount);
                }

            } else {
                // If no sell token got withdrawn and user has not paid yet, revert
                if (!paid) revert("ActionWithdrawBatchExchangeWithMaker: Insufficient balance for user to pay for withdrawal 2");

            }
        }
        catch {
            // Do not revert, as order might have been filled completely
            revert("ActionWithdrawBatchExchangeWithMaker.withdraw _sellToken failed");
        }

    }

    function getEthFee() view public returns(uint256) {
        uint256 ethPrice = uint256(medianizer.read());
        return 1 ether * 3 ether / ethPrice;

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
        (, address _userProxy, address _sellToken, address _buyToken) = abi.decode(
            _actionData[4:],
            (address,address,address,address)
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
        // uint32 currentBatchId = batchExchange.getCurrentBatchId();
        // if (_batchIdEnablingWithdraw < currentBatchId) {
        //     return OK;
        // } else {
        //     return "ActionWithdrawBatchExchangeWithMaker: Not withdrawable yet";
        // }

        // @ DEV: Problem, as we dont have a way to on-chain check if there are actually funds that can be withdrawn, the business model relies on the assumption that sufficient funds are availabe to be withdrawn in order to compensate the executor


        bool sellTokenWithdrawable = batchExchange.hasValidWithdrawRequest(_userProxy, _sellToken);

        if (!sellTokenWithdrawable) {
            return "ActionWithdrawBatchExchangeWithMaker: Sell Token not withdrawable yet";
        }

        bool buyTokenWithdrawable = batchExchange.hasValidWithdrawRequest(_userProxy, _buyToken);

        if (!buyTokenWithdrawable) {
            return "ActionWithdrawBatchExchangeWithMaker: Buy Token not withdrawable yet";
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
            revert("ActionWithdrawBatchExchangeWithMaker.getDecimals no decimals found");
        }
    }
}