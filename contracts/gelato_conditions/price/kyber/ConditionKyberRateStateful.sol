// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import {GelatoStatefulConditionsStandard} from "../../GelatoStatefulConditionsStandard.sol";
import {IKyberNetworkProxy} from "../../../dapp_interfaces/kyber/IKyberNetworkProxy.sol";
import {SafeMath} from "../../../external/SafeMath.sol";
import {IERC20} from "../../../external/IERC20.sol";
import {IGelatoCore} from "../../../gelato_core/interfaces/IGelatoCore.sol";

contract ConditionKyberRateStateful is GelatoStatefulConditionsStandard {
    using SafeMath for uint256;

    IKyberNetworkProxy public immutable KYBER;

    // userProxy => taskReceipt.id => refPrice
    mapping(address => mapping(uint256 => uint256)) public refRate;

    constructor(IKyberNetworkProxy _kyberNetworkProxy, IGelatoCore _gelatoCore)
        public
        GelatoStatefulConditionsStandard(_gelatoCore)
    {
        KYBER = _kyberNetworkProxy;
    }

    /// @dev use this function to encode the data off-chain for the condition data field
    function getConditionData(
        address _userProxy,
        address _sendToken,
        uint256 _sendAmount,
        address _receiveToken,
        bool _greaterElseSmaller
    )
        public
        pure
        virtual
        returns(bytes memory)
    {
        return abi.encodeWithSelector(
            this.checkRefKyberRate.selector,
            uint256(0),  // taskReceiptId placeholder
            _userProxy,
            _sendToken,
            _sendAmount,
            _receiveToken,
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
        return checkRefKyberRate(
            _taskReceiptId, userProxy, sendToken, sendAmount, receiveToken, greaterElseSmaller
        );
    }

    // Specific Implementation
    function checkRefKyberRate(
        uint256 _taskReceiptId,
        address _userProxy,
        address _sendToken,
        uint256 _sendAmount,
        address _receiveToken,
        bool _greaterElseSmaller
    )
        public
        view
        virtual
        returns(string memory)
    {
        uint256 currentRefRate = refRate[_userProxy][_taskReceiptId];
        try KYBER.getExpectedRate(_sendToken, _receiveToken, _sendAmount)
            returns(uint256 expectedRate, uint256)
        {
            if (_greaterElseSmaller) {  // greaterThan
                if (expectedRate >= currentRefRate) return OK;
                return "NotOkKyberExpectedRateIsNotGreaterThanRefRate";
            } else {  // smallerThan
                if (expectedRate <= currentRefRate) return OK;
                return "NotOkKyberExpectedRateIsNotSmallerThanRefRate";
            }
        } catch {
            return "KyberGetExpectedRateError";
        }
    }

    /// @dev This function should be called via the userProxy of a Gelato Task as part
    ///  of the Task.actions, if the Condition state should be updated after the task.
    /// @param _rateDelta The change in price after which this condition should return for a given taskId
    /// @param _idDelta Default to 0. If you submit multiple tasks in one action, this can help
    // customize which taskId the state should be allocated to
    function setRefRate(
        address _sendToken,
        uint256 _sendAmount,
        address _receiveToken,
        bool _greaterElseSmaller,
        uint256 _rateDelta,
        uint256 _idDelta
    )
        external
    {
        uint256 taskReceiptId = _getIdOfNextTaskInCycle() + _idDelta;
        try KYBER.getExpectedRate(_sendToken, _receiveToken, _sendAmount)
            returns(uint256 expectedRate, uint256)
        {
            if (_greaterElseSmaller) {
                refRate[msg.sender][taskReceiptId] = expectedRate.add(_rateDelta);
            } else {
                refRate[msg.sender][taskReceiptId] = expectedRate.sub(
                    _rateDelta,
                    "ConditionKyberRateStateful.setRefRate: Underflow"
                );
            }
        } catch {
            revert("ConditionKyberRateStateful.setRefRate: KyberGetExpectedRateError");
        }
    }

    function getKyberRate(address _sendToken, uint256 _sendAmount, address _receiveToken)
        external
        view
        returns(uint256)
    {
        try KYBER.getExpectedRate(_sendToken, _receiveToken, _sendAmount)
            returns(uint256 expectedRate, uint256)
        {
            return expectedRate;
        } catch {
            revert("ConditionKyberRateStateful.setRefRate: KyberGetExpectedRateError");
        }
    }
}