pragma solidity ^0.6.0;

import "../../IGelatoCondition.sol";
import "../../../dapp_interfaces/kyber/IKyber.sol";
import "../../../external/SafeMath.sol";

contract ConditionKyberRate is IGelatoCondition {

    using SafeMath for uint256;

    enum Reason {
        // StandardReason Fields
        Ok,  // 0: Standard Field for Fulfilled Conditions and No Errors
        NotOk,  // 1: Standard Field for Unfulfilled Conditions or Caught/Handled Errors
        UnhandledError,  // 2: Standard Field for Uncaught/Unhandled Errors
        // Ok: Fulfilled Conditions
        OkKyberExpectedRateIsGreaterThanRefRate,
        OkKyberExpectedRateIsSmallerThanRefRate,
        // NotOk: Unfulfilled Conditions
        NotOkKyberExpectedRateIsNotGreaterThanRefRate,
        NotOkKyberExpectedRateIsNotSmallerThanRefRate,
        KyberGetExpectedRateError
    }

    // conditionSelector public state variable np due to this.actionSelector constant issue
    function conditionSelector() external pure override returns(bytes4) {
        return this.reached.selector;
    }
    uint256 public constant override conditionGas = 1000000;

    function reached(
        address _src,
        uint256 _srcAmt,
        address _dest,
        uint256 _refRate,
        bool _greaterElseSmaller
    )
        external
        view
        returns(bool, uint8)  // executable?, reason
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
                if (expectedRate >= _refRate)
                    return (true, uint8(Reason.OkKyberExpectedRateIsGreaterThanRefRate));
                else
                    return (false, uint8(Reason.NotOkKyberExpectedRateIsNotGreaterThanRefRate));
            } else {  // smallerThan
                if (expectedRate <= _refRate)
                    return (true, uint8(Reason.OkKyberExpectedRateIsSmallerThanRefRate));
                else
                    return(false, uint8(Reason.NotOkKyberExpectedRateIsNotSmallerThanRefRate));
            }
        } catch {
            return(false, uint8(Reason.KyberGetExpectedRateError));
        }
    }

    function getConditionValue(address _src, uint256 _srcAmt, address _dest, uint256, bool)
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