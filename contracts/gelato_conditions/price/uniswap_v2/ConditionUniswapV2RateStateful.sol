// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import {GelatoStatefulConditionsStandard} from "../../GelatoStatefulConditionsStandard.sol";
import {IUniswapV2Router02, IUniswapV2Factory, IWETH} from "../../../dapp_interfaces/uniswap_v2/IUniswapV2.sol";
import {SafeMath} from "../../../external/SafeMath.sol";
import {IGelatoCore} from "../../../gelato_core/interfaces/IGelatoCore.sol";
import {IERC20} from "../../../external/IERC20.sol";


contract ConditionUniswapV2RateStateful is GelatoStatefulConditionsStandard {
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
        IWETH _weth,
        IGelatoCore _gelatoCore
    )
        public
        GelatoStatefulConditionsStandard(_gelatoCore)
    {
        uniRouter = _uniswapV2Router;
        uniFactory = _uniswapV2Factory;
        WETH = _weth;
    }

    /// @dev use this function to encode the data off-chain for the condition data field
    function getConditionData(
        address _userProxy,
        address _sellToken,
        uint256 _sellAmount,
        address _buyToken,
        bool _greaterElseSmaller
    )
        public
        pure
        virtual
        returns(bytes memory)
    {
        return abi.encodeWithSelector(
            this.checkRefRateUniswap.selector,
            uint256(0),  // taskReceiptId placeholder
            _userProxy,
            _sellToken,
            _sellAmount,
            _buyToken,
            _greaterElseSmaller
        );
    }

    // STANDARD Interface
    /// @param _conditionData The encoded data from getConditionData()
    function ok(uint256 _taskReceiptId, bytes calldata _conditionData, uint256)
        public
        view
        virtual
        override
        returns(string memory)
    {
        (address userProxy,
         address sendToken,
         uint256 sendAmount,
         address receiveToken,
         bool greaterElseSmaller
        ) = abi.decode(
             _conditionData[36:],  // slice out selector & taskReceiptId
             (address,address,uint256,address,bool)
         );
        return checkRefRateUniswap(
            _taskReceiptId, userProxy, sendToken, sendAmount, receiveToken, greaterElseSmaller
        );
    }

    // Specific Implementation
    function checkRefRateUniswap(
        uint256 _taskReceiptId,
        address _userProxy,
        address _sellToken,
        uint256 _sellAmount,
        address _buyToken,
        bool _greaterElseSmaller
    )
        public
        view
        virtual
        returns(string memory)
    {
        uint256 currentRefRate = refRate[_userProxy][_taskReceiptId];

        (_sellToken, _buyToken) = convertEthToWeth(_sellToken, _buyToken);

        uint256 expectedRate = getUniswapRate(_sellToken, _sellAmount, _buyToken);

        if (_greaterElseSmaller) {  // greaterThan
            if (expectedRate >= currentRefRate) return OK;
            else return "ExpectedRateIsNotGreaterThanRefRate";
        } else {  // smallerThan
            if (expectedRate <= currentRefRate) return OK;
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

    /// @dev This function should be called via the userProxy of a Gelato Task as part
    ///  of the Task.actions, if the Condition state should be updated after the task.
    /// @param _rateDeltaAbsolute The change in price after which this condition should return for a given taskId
    /// @param _idDelta Default to 0. If you submit multiple tasks in one action, this can help
    // customize which taskId the state should be allocated to
    function setRefRateAbsolute(
        address _sellToken,
        uint256 _sellAmount,
        address _buyToken,
        bool _greaterElseSmaller,
        uint256 _rateDeltaAbsolute,
        uint256 _idDelta
    )
        external
    {
        uint256 taskReceiptId = _getIdOfNextTaskInCycle() + _idDelta;

        (_sellToken, _buyToken) = convertEthToWeth(_sellToken, _buyToken);

        uint256 expectedRate = getUniswapRate(_sellToken, _sellAmount, _buyToken);
        if (_greaterElseSmaller) {
            refRate[msg.sender][taskReceiptId] = expectedRate.add(_rateDeltaAbsolute);
        } else {
            refRate[msg.sender][taskReceiptId] = expectedRate.sub(
                _rateDeltaAbsolute,
                "ConditionKyberRateStateful.setRefRate: Underflow"
            );
        }

    }

    /// @dev This function should be called via the userProxy of a Gelato Task as part
    ///  of the Task.actions, if the Condition state should be updated after the task.
    /// @param _rateDeltaNominator The nominator defining the % change, e.g. 50 for 50%
    /// @param _idDelta Default to 0. If you submit multiple tasks in one action, this can help
    // customize which taskId the state should be allocated to
    function setRefRateRelative(
        address _sellToken,
        uint256 _sellAmount,
        address _buyToken,
        bool _greaterElseSmaller,
        uint256 _rateDeltaNominator,
        uint256 _idDelta
    )
        external
    {
        uint256 taskReceiptId = _getIdOfNextTaskInCycle() + _idDelta;

        (_sellToken, _buyToken) = convertEthToWeth(_sellToken, _buyToken);

        uint256 expectedRate = getUniswapRate(_sellToken, _sellAmount, _buyToken);
        uint256 absoluteDelta = expectedRate.mul(_rateDeltaNominator).div(100);
        if (_greaterElseSmaller) {
            refRate[msg.sender][taskReceiptId] = expectedRate.add(absoluteDelta);
        } else {
            refRate[msg.sender][taskReceiptId] = expectedRate.sub(
                absoluteDelta,
                "ConditionKyberRateStateful.setRefRate: Underflow"
            );
        }

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