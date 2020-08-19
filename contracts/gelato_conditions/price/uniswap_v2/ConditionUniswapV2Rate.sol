// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import {GelatoConditionsStandard} from "../../GelatoConditionsStandard.sol";
import {IUniswapV2Router02, IUniswapV2Factory, IWETH} from "../../../dapp_interfaces/uniswap_v2/IUniswapV2.sol";
import {SafeMath} from "../../../external/SafeMath.sol";
import {IGelatoCore} from "../../../gelato_core/interfaces/IGelatoCore.sol";
import {IERC20} from "../../../external/IERC20.sol";


contract ConditionUniswapV2Rate is GelatoConditionsStandard {
    using SafeMath for uint256;

    IUniswapV2Router02 public immutable uniRouter;
    IUniswapV2Factory public immutable uniFactory;
    IWETH public immutable WETH;
    address internal constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    // userProxy => taskReceipt.id => refPrice
    mapping(address => mapping(uint256 => uint256)) public refRate;

    constructor(
        IUniswapV2Router02 _uniswapV2Router,
        IUniswapV2Factory _uniswapV2Factory,
        IWETH _weth
    )
        public
    {
        uniRouter = _uniswapV2Router;
        uniFactory = _uniswapV2Factory;
        WETH = _weth;
    }

    /// @dev use this function to encode the data off-chain for the condition data field
    function getConditionData(
        address _sellToken,
        uint256 _sellAmount,
        address _buyToken,
        uint256 _currentRefRate,
        bool _greaterElseSmaller
    )
        public
        pure
        virtual
        returns(bytes memory)
    {
        return abi.encodeWithSelector(
            this.checkRefRateUniswap.selector,
            _sellToken,
            _sellAmount,
            _buyToken,
            _currentRefRate,
            _greaterElseSmaller
        );
    }

    // STANDARD Interface
    /// @param _conditionData The encoded data from getConditionData()
    function ok(uint256, bytes calldata _conditionData, uint256)
        public
        view
        virtual
        override
        returns(string memory)
    {
        (address sendToken,
         uint256 sendAmount,
         address buyToken,
         uint256 currentRefRate,
         bool greaterElseSmaller
        ) = abi.decode(
             _conditionData[4:],  // slice out selector & taskReceiptId
             (address,uint256,address,uint256,bool)
         );
        return checkRefRateUniswap(
            sendToken, sendAmount, buyToken, currentRefRate, greaterElseSmaller
        );
    }

    // Specific Implementation
    function checkRefRateUniswap(
        address _sellToken,
        uint256 _sellAmount,
        address _buyToken,
        uint256 _currentRefRate,
        bool _greaterElseSmaller
    )
        public
        view
        virtual
        returns(string memory)
    {

        (_sellToken, _buyToken) = convertEthToWeth(_sellToken, _buyToken);

        uint256 expectedRate = getUniswapRate(_sellToken, _sellAmount, _buyToken);

        if (_greaterElseSmaller) {  // greaterThan
            if (expectedRate >= _currentRefRate) return OK;
            else return "ExpectedRateIsNotGreaterThanRefRate";
        } else {  // smallerThan
            if (expectedRate <= _currentRefRate) return OK;
            else return "ExpectedRateIsNotSmallerThanRefRate";
        }

    }

    function getPaths(address _sellToken, address _buyToken)
        internal pure returns(address[] memory paths)
    {
        paths = new address[](2);
        paths[0] = _sellToken;
        paths[1] = _buyToken;
    }


    function getUniswapRate(address _sellToken, uint256 _sellAmount, address _buyToken)
        public
        view
        returns(uint256 expectedRate)
    {
        address[] memory tokenPath = getPaths(_sellToken, _buyToken);

        try uniRouter.getAmountsOut(_sellAmount, tokenPath)
            returns (uint[] memory expectedRates) {
            expectedRate = expectedRates[1];
        } catch {
            revert("UniswapV2GetExpectedRateError");
        }
    }

    function convertEthToWeth(address _sellToken, address _buyToken)
        private
        view
        returns(address, address)
    {
        if (_sellToken == ETH_ADDRESS) _sellToken = address(WETH);
        if (_buyToken == ETH_ADDRESS) _buyToken = address(WETH);
        return (_sellToken, _buyToken);
    }
}