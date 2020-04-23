pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { GelatoActionsStandard } from "../../GelatoActionsStandard.sol";
import { SafeMath } from "../../../external/SafeMath.sol";
import { IGelatoCondition } from "../../../gelato_conditions/IGelatoCondition.sol";
import { IGelatoCore, ExecClaim } from "../../../gelato_core/interfaces/IGelatoCore.sol";

struct ActionData {
    // multi create delegatecall requirement
    IGelatoCore gelatoCore;
    // gelatoCore.submitTask params
    ExecClaim execClaim;
    uint256 startTime;  // will be encoded here
    // MultiSubmitTimeBased params
    uint256 intervalSpan;
    uint256 numOfSubmissions;
}

// CAUTION this contract is not up to date with Action standards due to missing return values
//  (GelatoCore.Enums.ExecutionResult, uint8 reason) - not possible due to stack too deep
contract ActionMultiSubmitForConditionTimestampPassed is GelatoActionsStandard {

    using SafeMath for uint256;

    function action(bytes calldata _actionData) external payable override virtual {
        ActionData memory _p = abi.decode(_actionData[4:], (ActionData));
        action(_p);
    }

    // Specific Implementation: Caution when using storage in delegatecall
    function action(ActionData memory _p) public payable virtual {
        for (uint256 i = 0; i < _p.numOfSubmissions; i++) {
            uint256 timestamp = _p.startTime.add(_p.intervalSpan.mul(i));
            _p.execClaim.task.condition.data = abi.encodeWithSelector(
                IGelatoCondition.ok.selector,
                timestamp
            );
            _p.gelatoCore.submitTask(_p.execClaim.task);
        }
    }
}