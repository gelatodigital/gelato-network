pragma solidity ^0.6.6;

import { IUniswapFactory } from '../dapp_interfaces/uniswap/IUniswapFactory.sol';
import { IUniswapExchange } from '../dapp_interfaces/uniswap/IUniswapExchange.sol';
import { IMedianizer } from "../dapp_interfaces/maker/IMakerMedianizer.sol";

import { IKyber } from '../dapp_interfaces/kyber/IKyber.sol';
import { IERC20 } from '../external/IERC20.sol';
import { SafeMath } from '../external/SafeMath.sol';

contract FeeFinder {

    using SafeMath for uint256;

    // Fee
    uint256 public constant feeDAI = 3; //DAI
    uint256 public constant feeDAIWei = 3 ether; //DAI

    // Hardcoded Tokens
    address public immutable DAI;
    address public immutable GUSD;
    address public immutable USDT;
    address public immutable TUSD;
    address public immutable USDC;
    address public immutable PAX;
    address public immutable sUSD;
    address public immutable WETH;

    // DEXs
    IKyber public immutable kyber;
    IUniswapExchange public immutable uniswapDaiExchange;
    IUniswapFactory public immutable uniswapFactory;
    // Maker Medianizer for WETH Exchange Rate
    IMedianizer private immutable medianizer;

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
        address _medianizer
    ) public {

        // Token Configuration
        DAI = _dai;
        GUSD = _gusd;
        USDT = _usdt;
        TUSD = _tusd;
        USDC = _usdc;
        PAX = _pax;
        sUSD = _susd;
        WETH = _weth;

        // Exchange Configuration
        kyber = IKyber(_kyberProxyAddress);
        uniswapFactory = IUniswapFactory(_uniswapFactory);
        uniswapDaiExchange = IUniswapExchange(_uniswapDaiExchange);
        medianizer = IMedianizer(_medianizer);
    }


    /// @notice Is the inputted _feeToken accepted in this smart contract?
    /// @dev Off-chain API for UIs to see if _feeToken is accepted by smart contract
    /// @param _feeToken token held in proxy contract that will used to pay the fees to the provider
    function isFeeTokenEligible(address _feeToken) view public returns(bool feeTokenAccepted) {
        uint256 feeAmount = getFeeAmount(_feeToken);
        feeTokenAccepted = feeAmount == 0 ?  false : true;
    }

    /// @notice Get the fee amount based on the inputted fee token
    /// @dev Returns 0 if no matching fee token was found
    /// @param _feeToken token held in proxy contract that will used to pay the fees to the provider
    function getFeeAmount(address _feeToken) view public returns(uint256 feeAmount) {
        feeAmount = checkHardcodedTokens(_feeToken);
        if(feeAmount == 0) feeAmount = getUniswapRate(_feeToken);
        if(feeAmount == 0) feeAmount = getKyberRate(_feeToken);
    }

    function checkHardcodedTokens(address _feeToken) view public returns(uint256 feeAmount) {
        if (_feeToken == DAI) feeAmount = feeDAI*10**18;
        if (_feeToken == USDT) feeAmount = feeDAI*10**6;
        if (_feeToken == GUSD) feeAmount = feeDAI*10**2;
        if (_feeToken == TUSD) feeAmount = feeDAI*10**18;
        if (_feeToken == USDC) feeAmount = feeDAI*10**6;
        if (_feeToken == PAX) feeAmount = feeDAI*10**18;
        if (_feeToken == sUSD) feeAmount = feeDAI*10**18;
        if (_feeToken == WETH) feeAmount = getMakerEthOracleRate();
    }

    function getUniswapRate(address _feeToken) view public returns(uint256 feeAmount) {
        IUniswapExchange feeTokenExchange = uniswapFactory.getExchange(IERC20(_feeToken));
        if(feeTokenExchange != IUniswapExchange(0)) {
            // 1. Get Price of X DAI to ETH
            try uniswapDaiExchange.getTokenToEthInputPrice(feeDAIWei)
                returns(uint256 _daiValueInEth)
            {
                try feeTokenExchange.getEthToTokenInputPrice(_daiValueInEth)
                    returns(uint256 _ethValueInFeeToken)
                {
                    feeAmount = _ethValueInFeeToken;

                } catch {feeAmount = 0;}

            } catch {feeAmount = 0;}
        }
    }

    function getKyberRate(address _feeToken) view public returns(uint256 feeAmount) {
        uint256 decimals = getDecimals(_feeToken);

        if (decimals != 0) {
            try kyber.getExpectedRate(DAI, _feeToken, feeAmount)
                returns(uint256 expectedRate, uint256)
            {
                if (expectedRate != 0) {
                    // 18 == daiDecimals
                    uint256 decimalFactor = (10 ** 18) / (10 ** decimals);
                    feeAmount = expectedRate.mul(feeDAI).div(decimalFactor);
                } else feeAmount = 0;
            } catch {
                feeAmount = 0;
            }
        }
    }

    function getMakerEthOracleRate() view public returns(uint256 feeAmount) {
        uint256 ethPrice = uint256(medianizer.read());
        feeAmount = 10**18  * feeDAIWei / ethPrice;
    }

    function getDecimals(address _feeToken)
        internal
        view
        returns(uint256)
    {
        (bool success, bytes memory data) = address(_feeToken).staticcall{gas: 20000}(
            abi.encodeWithSignature("decimals()")
        );

        if (!success) {
            (success, data) = address(_feeToken).staticcall{gas: 20000}(
                abi.encodeWithSignature("DECIMALS()")
            );
        }

        if (success) {
            return abi.decode(data, (uint256));
        } else {
            return 0;
        }
    }
}