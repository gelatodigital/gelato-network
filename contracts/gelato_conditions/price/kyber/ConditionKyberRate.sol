// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import {GelatoConditionsStandard} from "../../GelatoConditionsStandard.sol";
import {IKyber} from "../../../dapp_interfaces/kyber/IKyber.sol";
import {SafeMath} from "../../../external/SafeMath.sol";

contract ConditionKyberRate is GelatoConditionsStandard {

    using SafeMath for uint256;

    address public immutable kyberProxyAddress;
    constructor(address _kyberProxy) public { kyberProxyAddress = _kyberProxy; }

    // STANDARD Interface
    function ok(uint256, bytes calldata _checkRateData)
        external
        view
        virtual
        override
        returns(string memory)
    {
        (address src,
         uint256 srcAmt,
         address dest,
         uint256 refRate,
         bool greaterElseSmaller) = abi.decode(
            _checkRateData,
            (address,uint256,address,uint256,bool)
         );
        return checkRate(src, srcAmt, dest, refRate, greaterElseSmaller);
    }

    // Specific Implementation
    function checkRate(
        address _src,
        uint256 _srcAmt,
        address _dest,
        uint256 _refRate,
        bool _greaterElseSmaller
    )
        public
        view
        virtual
        returns(string memory)
    {
        try IKyber(kyberProxyAddress).getExpectedRate(_src, _dest, _srcAmt)
            returns(uint256 expectedRate, uint256)
        {
            if (_greaterElseSmaller) {  // greaterThan
                if (expectedRate >= _refRate) return OK;
                return "NotOkKyberExpectedRateIsNotGreaterThanRefRate";
            } else {  // smallerThan
                if (expectedRate <= _refRate) return OK;
                return "NotOkKyberExpectedRateIsNotSmallerThanRefRate";
            }
        } catch {
            return "KyberGetExpectedRateError";
        }
    }
}