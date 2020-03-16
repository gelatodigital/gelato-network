pragma solidity ^0.6.2;

import "../conditions/price/kyber/ConditionKyberRate.sol";

contract ConditionKyberRateError {

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

    uint256 public conditionGas = 500000;

    function setConditionGas(uint256 _gas) external {
        conditionGas = _gas;
    }

    function canExecute(
        ConditionKyberRate _conditionKyberRate,
        // The parameters we need to encode
        address _src,
        uint256 _srcAmt,
        address _dest,
        uint256 _refRate,
        bool _greaterElseSmaller
    )
        external
        view
        returns(string memory)
    {
        bytes4 reachedSelector = _conditionKyberRate.reached.selector;

        bytes memory reachedPayload = abi.encodeWithSelector(
            reachedSelector,
            _src,
            _srcAmt,
            _dest,
            _refRate,
            _greaterElseSmaller
        );

        (bool success,
         bytes memory returndata)
            = address(_conditionKyberRate).staticcall{gas: conditionGas}(reachedPayload);

        if (!success) return "Unhandled Condition Error";
        else {
            (, uint8 reason) = abi.decode(returndata, (bool, uint8));

            if (reason == uint8(Reason.Ok)) return "ConditionKyberRate: Ok";

            else if (reason == uint8(Reason.NotOk)) return "ConditionKyberRate: NotOk";

            else if (reason == uint8(Reason.UnhandledError))
                return "ConditionKyberRate: UnhandledError";

            else if (reason == uint8(Reason.OkKyberExpectedRateIsGreaterThanRefRate))
                return "ConditionKyberRate: OkKyberExpectedRateIsGreaterThanRefRate";

            else if (reason == uint8(Reason.OkKyberExpectedRateIsSmallerThanRefRate))
                return "ConditionKyberRate: OkKyberExpectedRateIsSmallerThanRefRate";

            else if (reason == uint8(Reason.NotOkKyberExpectedRateIsNotGreaterThanRefRate))
                return "ConditionKyberRate: NotOkKyberExpectedRateIsNotGreaterThanRefRate";

            else if (reason == uint8(Reason.NotOkKyberExpectedRateIsNotSmallerThanRefRate))
                return "ConditionKyberRate: NotOkKyberExpectedRateIsNotSmallerThanRefRate";

            else if (reason == uint8(Reason.KyberGetExpectedRateError))
                return "ConditionKyberRate: KyberGetExpectedRateError";

            else return "Unidentified ConditionKyberRate reason";
        }
    }
}