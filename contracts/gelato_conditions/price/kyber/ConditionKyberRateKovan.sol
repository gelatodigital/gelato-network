pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { GelatoConditionsStandard } from "../../GelatoConditionsStandard.sol";
import { IKyber } from "../../../dapp_interfaces/kyber/IKyber.sol";
import { SafeMath } from "../../../external/SafeMath.sol";

contract ConditionKyberRateKovan is GelatoConditionsStandard {

    using SafeMath for uint256;

    // STANDARD Interface
    function ok(bytes calldata _conditionPayload)
        external
        view
        override
        virtual
        returns(string memory)
    {
        (address src,
         uint256 srcAmt,
         address dest,
         uint256 refRate,
         bool greaterElseSmaller) = abi.decode(
             _conditionPayload[4:],
             (address,uint256,address,uint256,bool)
         );
        return ok(src, srcAmt, dest, refRate, greaterElseSmaller);
    }

    // Specific Implementation
    function ok(
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
        // !!!!!!!!! KOVAN !!!!!!
        address kyberAddress = 0x692f391bCc85cefCe8C237C01e1f636BbD70EA4D;

        try IKyber(kyberAddress).getExpectedRate(_src, _dest, _srcAmt)
            returns(uint256 expectedRate, uint256)
        {
            if (_greaterElseSmaller) {  // greaterThan
                if (expectedRate >= _refRate) return "ok0";
                return "NotOkKyberExpectedRateIsNotGreaterThanRefRate";
            } else {  // smallerThan
                if (expectedRate <= _refRate) return "ok1";
                return "NotOkKyberExpectedRateIsNotSmallerThanRefRate";
            }
        } catch {
            return "KyberGetExpectedRateError";
        }
    }
}