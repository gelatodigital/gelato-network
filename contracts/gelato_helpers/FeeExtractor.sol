pragma solidity ^0.6.6;

import { IUniswapFactory } from '../dapp_interfaces/uniswap/IUniswapFactory.sol';
import { IUniswapExchange } from '../dapp_interfaces/uniswap/IUniswapExchange.sol';
import { IMedianizer } from "../dapp_interfaces/maker/IMakerMedianizer.sol";

import { IKyber } from '../dapp_interfaces/kyber/IKyber.sol';
import { IERC20 } from '../external/IERC20.sol';
import { SafeMath } from '../external/SafeMath.sol';
import { SafeERC20 } from '../external/SafeERC20.sol';

import { FeeFinder } from './FeeFinder.sol';

contract FeeExtractor is FeeFinder {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // Address which receives the fee
    address public immutable provider;

    constructor(
        address _dai,
        address _usdt,
        address _gusd,
        address _tusd,
        address _usdc,
        address _pax,
        address _susd,
        address _weth,
        address _kyberProxyAddress,
        address _uniswapFactory,
        address _uniswapDaiExchange,
        address _medianizer,
        address _provider
    ) FeeFinder(
        _dai,
        _usdt,
        _gusd,
        _tusd,
        _usdc,
        _pax,
        _susd,
        _weth,
        _kyberProxyAddress,
        _uniswapFactory,
        _uniswapDaiExchange,
        _medianizer
    ) public {
        provider = _provider;
    }

    /// @dev only call into this function
    function payFee(address _feeToken, uint256 _feeAmount)
        external
    {
        require(_feeAmount != 0, "FeeExtractor.payFee: Fee token not accepted");

        // Check if feeAmount is correct
        require(getFeeAmount(_feeToken) == _feeAmount, "FeeExtractor.payFee: Fee amount incorrect");

        // Transfer fee to provider
        IERC20(_feeToken).safeTransferFrom(msg.sender, provider, _feeAmount);

        // Mark that userProxy has paid for the action
        buyCredit(msg.sender);
    }
}