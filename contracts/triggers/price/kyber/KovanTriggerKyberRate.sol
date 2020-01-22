pragma solidity ^0.6.0;

import "../../IGelatoTrigger.sol";
import "../../../dapp_interfaces/kyber/IKyber.sol";
import "../../../external/SafeMath.sol";

contract KovanTriggerKyberRate is IGelatoTrigger {

    using SafeMath for uint256;

    enum Reason {
        // StandardReason Fields
        Ok,  // 0: Standard Field for Fulfilled Conditions and No Errors
        NotOk,  // 1: Standard Field for Unfulfilled Conditions or Caught/Handled Errors
        UnhandledError,  // 2: Standard Field for Uncaught/Unhandled Errors
        // Ok: Fulfilled Conditions
        OkKyberExpectedRateIsGreaterThanRefRate,
        OkKyberExpectedRateIsGreaterThanBufferedRefRate,
        OkKyberExpectedRateIsSmallerThanRefRate,
        OkKyberExpectedRateIsSmallerThanBufferedRefRate,
        // NotOk: Unfulfilled Conditions
        NotOkKyberSlippageRateIsNotGreaterThanRefRate,
        NotOkKyberExpectedRateIsNotSmallerThanBufferedRefRate,
        KyberGetExpectedRateError
    }

    // triggerSelector public state variable np due to this.actionSelector constant issue
    function triggerSelector() external pure override returns(bytes4) {
        return this.fired.selector;
    }
    uint256 public constant override triggerGas = 300000;

    function fired(
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
        // !!!!!!!!! KOVAN !!!!!!
        address kyberAddress = 0x692f391bCc85cefCe8C237C01e1f636BbD70EA4D;

        try IKyber(kyberAddress).getExpectedRate(
            _src,
            _dest,
            _srcAmt
        )
            returns(uint256 expectedRate, uint256 slippageRate)
        {
            if (_greaterElseSmaller) {  // greaterThan
                uint256 buffer = expectedRate.sub(slippageRate);
                uint256 bufferedRefRate = _refRate.sub(buffer);
                if (expectedRate >= _refRate)
                    return (true, uint8(Reason.OkKyberExpectedRateIsGreaterThanRefRate));
                else if (expectedRate >= bufferedRefRate)
                    return (true, uint8(Reason.OkKyberExpectedRateIsGreaterThanBufferedRefRate));
                else
                    return (false, uint8(Reason.NotOkKyberSlippageRateIsNotGreaterThanRefRate));
            } else {  // smallerThan
                uint256 buffer = expectedRate.sub(slippageRate);
                uint256 bufferedRefRate = _refRate.add(buffer);
                if (expectedRate <= _refRate)
                    return (true, uint8(Reason.OkKyberExpectedRateIsSmallerThanRefRate));
                else if (expectedRate <= bufferedRefRate)
                    return (true, uint8(Reason.OkKyberExpectedRateIsSmallerThanBufferedRefRate));
                else
                    return(false, uint8(Reason.NotOkKyberExpectedRateIsNotSmallerThanBufferedRefRate));
            }
        } catch {
            return(false, uint8(Reason.KyberGetExpectedRateError));
        }
    }

    function getTriggerValue(address _src, uint256 _srcAmt, address _dest, uint256, bool)
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