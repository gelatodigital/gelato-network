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


    /// @notice Check if proxy contract has sufficient funds and if provider accepts token to pay fee
    /// @dev Only delegatecall into this function!
    /// @param _feeTokens token held in proxy contract that will used to pay the fees to the provider
    function safeTransferWithFee(address[] calldata _feeTokens, address _user)
        external returns (bool feePaid)
    {
        for (uint256 i; i < _feeTokens.length; i++) {
            address feeToken = _feeTokens[i];
            uint256 feeAmount = getFeeAmount(feeToken);

            if (feeAmount == 0) continue;
            uint256 feeTokenBalance = IERC20(feeToken).balanceOf(address(this));

            if (feeTokenBalance < feeAmount) continue;
            IERC20(feeToken).safeTransfer(provider, feeAmount);

            if (_user != address(0)) IERC20(feeToken).safeTransfer(_user, feeTokenBalance - feeAmount);
            feePaid = true;
            break;
        }
        require(feePaid, "FeeExtractor.safeTransferWithFee: Fee not paid");
    }

}