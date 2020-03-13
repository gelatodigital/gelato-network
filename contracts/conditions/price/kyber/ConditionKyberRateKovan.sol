pragma solidity ^0.6.2;

import "../../IGelatoCondition.sol";
import "../../../dapp_interfaces/kyber/IKyber.sol";
import "../../../external/SafeMath.sol";

contract ConditionKyberRateKovan is IGelatoCondition {

    using SafeMath for uint256;

    // conditionSelector public state variable np due to this.actionSelector constant issue
    function conditionSelector() external pure override returns(bytes4) {
        return this.reached.selector;
    }

    function reached(
        address _src,
        uint256 _srcAmt,
        address _dest,
        uint256 _refRate,
        bool _greaterElseSmaller
    )
        external
        view
        returns(bool, string memory)  // executable?, reason
    {
        // !!!!!!!!! KOVAN !!!!!!
        address kyberAddress = 0x692f391bCc85cefCe8C237C01e1f636BbD70EA4D;

        try IKyber(kyberAddress).getExpectedRate(
            _src,
            _dest,
            _srcAmt
        )
            returns(uint256 expectedRate, uint256)
        {
            if (_greaterElseSmaller) {  // greaterThan
                if (expectedRate >= _refRate) return (true, "0");
                else return (false, "NotOkKyberExpectedRateIsNotGreaterThanRefRate");
            } else {  // smallerThan
                if (expectedRate <= _refRate) return (true, "1");
                else return(false, "NotOkKyberExpectedRateIsNotSmallerThanRefRate");
            }
        } catch {
            return(false, "KyberGetExpectedRateError");
        }
    }

    function getConditionValue(address _src, uint256 _srcAmt, address _dest, uint256, bool)
        external
        view
        returns(uint256)
    {
        // !!!!!!!!! ROPSTEN !!!!!!
        address kyberAddress = 0x692f391bCc85cefCe8C237C01e1f636BbD70EA4D;

        (uint256 expectedRate,) = IKyber(kyberAddress).getExpectedRate(_src, _dest, _srcAmt);
        return expectedRate;
    }
}