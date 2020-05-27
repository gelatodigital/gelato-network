// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;
pragma experimental ABIEncoderV2;

import { GelatoConditionsStandard } from "../../GelatoConditionsStandard.sol";
import { IKyber } from "../../../dapp_interfaces/kyber/IKyber.sol";
import { SafeMath } from "../../../external/SafeMath.sol";
import { IERC20 } from "../../../external/IERC20.sol";


contract ConditionKyberRateStateful is GelatoConditionsStandard {

    using SafeMath for uint256;

    address public immutable kyberProxyAddress;

    // userProxy => taskCycle id => refPrice
    mapping(address => mapping(uint256 => uint256)) public refRate;

    constructor(address _kyberProxy) public { kyberProxyAddress = _kyberProxy; }

    // STANDARD Interface
    function ok(bytes calldata _conditionData)
        external
        view
        override
        virtual
        returns(string memory)
    {
        (address proxyAddress,
         address src,
         uint256 srcAmt,
         address dest,
         bool greaterElseSmaller,
         uint256 _cycleId) = abi.decode(
             _conditionData[4:],
             (address,address,uint256,address,bool,uint256)
         );
        return ok(proxyAddress, src, srcAmt, dest, greaterElseSmaller, _cycleId);
    }

    // Specific Implementation
    function ok(
        address _proxyAddress,
        address _src,
        uint256 _srcAmt,
        address _dest,
        bool _greaterElseSmaller,
        uint256 _cycleId
    )
        public
        view
        virtual
        returns(string memory)
    {
        uint256 currentRefRate = refRate[_proxyAddress][_cycleId];
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
        uint256 _cycleId,
        uint256 _delta
    )
        external
    {
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
        refRate[msg.sender][_cycleId] = newRefRate;
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