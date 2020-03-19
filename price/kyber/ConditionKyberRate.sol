pragma solidity ^0.6.4;

import "../../IGelatoCondition.sol";
import "../../../dapp_interfaces/kyber/IKyber.sol";
import "../../../external/SafeMath.sol";

contract ConditionKyberRate is IGelatoCondition {

    using SafeMath for uint256;

    // conditionSelector public state variable np due to this.actionSelector constant issue
    function conditionSelector() external pure override returns(bytes4) {
        return this.ok.selector;
    }

    function ok(
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
        // !!!!!!!!! MAINNET !!!!!!
        address kyberAddress = 0x818E6FECD516Ecc3849DAf6845e3EC868087B755;

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

    function value(address _src, uint256 _srcAmt, address _dest, uint256, bool)
        external
        view
        returns(uint256)
    {
        // !!!!!!!!! MAINNET !!!!!!
        address kyberAddress = 0x818E6FECD516Ecc3849DAf6845e3EC868087B755;

        (uint256 expectedRate,) = IKyber(kyberAddress).getExpectedRate(_src, _dest, _srcAmt);
        return expectedRate;
    }
}