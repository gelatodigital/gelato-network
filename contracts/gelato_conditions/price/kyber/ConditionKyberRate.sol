// SPDX-License-Identifier: MIT
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import {GelatoConditionsStandard} from "../../GelatoConditionsStandard.sol";
import {IKyberNetworkProxy} from "../../../dapp_interfaces/kyber/IKyberNetworkProxy.sol";
import {SafeMath} from "../../../external/SafeMath.sol";

contract ConditionKyberRate is GelatoConditionsStandard {
    using SafeMath for uint256;

    IKyberNetworkProxy public immutable KYBER;
    constructor(IKyberNetworkProxy _kyberProxy) public { KYBER = _kyberProxy; }

    /// @dev use this function to encode the data off-chain for the condition data field
    function getConditionData(
        address _src,
        uint256 _srcAmt,
        address _dest,
        uint256 _refRate,
        bool _greaterElseSmaller
    )
        public
        pure
        virtual
        returns(bytes memory)
    {
        return abi.encodeWithSelector(
            this.checkRate.selector,
            _src,
            _srcAmt,
            _dest,
            _refRate,
            _greaterElseSmaller
        );
    }

    /// @param _conditionData The encoded data from getConditionData()
    function ok(uint256, bytes calldata _conditionData, uint256)
        public
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
            _conditionData[4:],
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
        try KYBER.getExpectedRate(_src, _dest, _srcAmt)
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