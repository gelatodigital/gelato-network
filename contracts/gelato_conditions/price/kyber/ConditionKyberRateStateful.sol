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

    address public immutable kyberProxyAddress;

    // userProxy => taskCycle id => refPrice
    mapping(address => mapping(uint256 => uint256)) public refRate;

    constructor(address _kyberProxy, IGelatoCore _gelatoCore)
        public
        GelatoStatefulConditionsStandard(_gelatoCore)
    {
        kyberProxyAddress = _kyberProxy;
    }

    // STANDARD Interface
    function ok(uint256 _taskId, bytes calldata _conditionData)
        external
        view
        virtual
        override
        returns(string memory)
    {
        (address proxyAddress,
         address src,
         uint256 srcAmt,
         address dest,
         bool greaterElseSmaller
         ) = abi.decode(
             _conditionData[4:],
             (address,address,uint256,address,bool)
         );
        return ok(proxyAddress, src, srcAmt, dest, greaterElseSmaller, _taskId);
    }

    // Specific Implementation
    function ok(
        address _proxyAddress,
        address _src,
        uint256 _srcAmt,
        address _dest,
        bool _greaterElseSmaller,
        uint256 _taskId
    )
        public
        view
        virtual
        returns(string memory)
    {
        uint256 currentRefRate = refRate[_proxyAddress][_taskId];
        try IKyber(kyberProxyAddress).getExpectedRate(_src, _dest, _srcAmt)
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
        uint256 taskId = _getIdOfNextTaskInCycle();
        uint256 newRefRate;
        try IKyber(kyberProxyAddress).getExpectedRate(_src, _dest, _srcAmt)
            returns(uint256 expectedRate, uint256)
        {
            if (_greaterElseSmaller) {  // greaterThan
                newRefRate = expectedRate.add(_delta);
            } else {  // smallerThan
                newRefRate = expectedRate.sub(_delta, "ConditionKyberRateStateful.setRefRate: Underflow");
            }
        } catch {
            revert("ConditionKyberRateStateful.setRefRate: KyberGetExpectedRateError");
        }
        refRate[msg.sender][taskId] = newRefRate;
    }

    function getKyberRate(
        address _src,
        uint256 _srcAmt,
        address _dest
    )
        external
        view
        returns(uint256)
    {
        uint256 expectedRate;
        try IKyber(kyberProxyAddress).getExpectedRate(_src, _dest, _srcAmt)
            returns(uint256 _expectedRate, uint256)
        {
            expectedRate = _expectedRate;
        } catch {
            revert("ConditionKyberRateStateful.setRefRate: KyberGetExpectedRateError");
        }
        return expectedRate;
    }
}