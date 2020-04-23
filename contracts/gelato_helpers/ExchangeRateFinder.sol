pragma solidity ^0.6.6;

// Import Uniswap & Kyber
import { IUniswapFactory } from '../dapp_interfaces/uniswap/IUniswapFactory.sol';
import { IUniswapExchange } from '../dapp_interfaces/uniswap/IUniswapExchange.sol';
import { IKyber } from '../dapp_interfaces/kyber/IKyber.sol';
import { IERC20 } from '../external/IERC20.sol';
import { SafeMath } from '../external/SafeMath.sol';

contract ExchangeRateFinder {

    using SafeMath for uint256;

    uint256 public constant feeDAI = 3; //DAI
    address public immutable dai;
    address public immutable geminiDollar;
    IKyber public immutable kyber;
    //IUniswapExchange public immutable uniswapExchange;

    constructor(address _dai, address _geminiDollar, address _kyberProxyAddress) public {
        dai = _dai;
        geminiDollar = _geminiDollar;
        kyber = IKyber(_kyberProxyAddress);
        /*
        IUniswapFactory uniswapFactory = IUniswapFactory(_uniswapFactory);
        uniswapExchange = uniswapFactory.getExchange(IERC20(_dai));
        */
    }

    function getFeeAmount(address _token) view public returns(uint256 feeAmount) {
        uint256 decimals = getDecimals(_token);

        try kyber.getExpectedRate(dai, _token, feeAmount)
            returns(uint256 expectedRate, uint256)
        {
            uint256 decimalFactor = (10 ** 18) / (10 ** decimals);
            if (expectedRate != 0) feeAmount = expectedRate.mul(feeDAI).div(decimalFactor);
            else {
                checkHardcodedTokens(_token);
            }
        } catch {
            revert("Error in kyber.getExpectedRate");
        }
    }

    function checkHardcodedTokens(address _token) view public {
        // IF GUSD =>
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