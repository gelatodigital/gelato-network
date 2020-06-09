// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import {GelatoStatefulConditionsStandard} from "../../GelatoStatefulConditionsStandard.sol";
import {IKyber} from "../../../dapp_interfaces/kyber/IKyber.sol";
import {SafeMath} from "../../../external/SafeMath.sol";
import {IERC20} from "../../../external/IERC20.sol";
import {IGelatoCore} from "../../../gelato_core/interfaces/IGelatoCore.sol";

contract ConditionKyberRateStateful is GelatoStatefulConditionsStandard {
    using SafeMath for uint256;

    IKyber public immutable kyberProxyAddress;

    // userProxy => taskReceipt.id => refPrice
    mapping(address => mapping(uint256 => uint256)) public refRate;

    constructor(IKyber _kyberProxy, IGelatoCore _gelatoCore)
        public
        GelatoStatefulConditionsStandard(_gelatoCore)
    {
        kyberProxyAddress = _kyberProxy;
    }

    /// @dev use this function to encode the data off-chain for the condition data field
    function getConditionData(
        address _userProxy,
        address _src,
        uint256 _srcAmt,
        address _dest,
        bool _greaterElseSmaller
    )
        public
        pure
        returns(bytes memory)
    {
        return abi.encodeWithSelector(this.checkRefKyberRate.selector, uint256(0), _userProxy, _src, _srcAmt, _dest, _greaterElseSmaller);
    }

    // STANDARD Interface
    function ok(uint256 _taskReceiptId, bytes calldata _conditionData, uint256)
        public
        view
        virtual
        override
        returns(string memory)
    {
        (address userProxy,
         address src,
         uint256 srcAmt,
         address dest,
         bool greaterElseSmaller
         ) = abi.decode(
             _conditionData[36:],
             (address,address,uint256,address,bool)
         );
        return checkRefKyberRate(_taskReceiptId, userProxy, src, srcAmt, dest, greaterElseSmaller);
    }

    // Specific Implementation
    function checkRefKyberRate(
        uint256 _taskReceiptId,
        address _userProxy,
        address _src,
        uint256 _srcAmt,
        address _dest,
        bool _greaterElseSmaller
    )
        public
        view
        virtual
        returns(string memory)
    {
        uint256 currentRefRate = refRate[_userProxy][_taskReceiptId];
        try kyberProxyAddress.getExpectedRate(_src, _dest, _srcAmt)
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
    function setRefRate(
        address _src,
        uint256 _srcAmt,
        address _dest,
        bool _greaterElseSmaller,
        uint256 _delta
    )
        external
    {
        uint256 taskReceiptId = _getIdOfNextTaskInCycle();
        uint256 newRefRate;
        try kyberProxyAddress.getExpectedRate(_src, _dest, _srcAmt)
            returns(uint256 expectedRate, uint256)
        {
            if (_greaterElseSmaller) newRefRate = expectedRate.add(_delta);
            else newRefRate = expectedRate.sub(_delta, "ConditionKyberRateStateful.setRefRate: Underflow");
        } catch {
            revert("ConditionKyberRateStateful.setRefRate: KyberGetExpectedRateError");
        }
        refRate[msg.sender][taskReceiptId] = newRefRate;
    }

    function getKyberRate(address _src, uint256 _srcAmt, address _dest)
        external
        view
        returns(uint256)
    {
        uint256 expectedRate;
        try kyberProxyAddress.getExpectedRate(_src, _dest, _srcAmt)
            returns(uint256 _expectedRate, uint256)
        {
            expectedRate = _expectedRate;
        } catch {
            revert("ConditionKyberRateStateful.setRefRate: KyberGetExpectedRateError");
        }
        return expectedRate;
    }
}