pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import { GelatoActionsStandard } from "../../GelatoActionsStandard.sol";
import { SafeMath } from "../../../external/SafeMath.sol";
import { IGelatoCondition } from "../../../gelato_conditions/IGelatoCondition.sol";
import { IGelatoCore, ExecClaim } from "../../../gelato_core/interfaces/IGelatoCore.sol";

struct ActionPayload {
    // multi mint delegatecall requirement
    IGelatoCore gelatoCore;
    // gelatoCore.mintExecClaim params
    ExecClaim execClaim;
    uint256 startTime;  // will be encoded here
    // MultiMintTimeBased params
    uint256 intervalSpan;
    uint256 numOfMints;
}

// CAUTION this contract is not up to date with Action standards due to missing return values
//  (GelatoCore.Enums.ExecutionResult, uint8 reason) - not possible due to stack too deep
contract ActionMultiMintForConditionTimestampPassed is GelatoActionsStandard {

    using SafeMath for uint256;

    function action(bytes calldata _actionPayload) external payable override virtual {
        ActionPayload memory _p = abi.decode(_actionPayload[4:], (ActionPayload));
        action(_p);
    }

    // Specific Implementation: Caution when using storage in delegatecall
    function action(ActionPayload memory _p) public payable virtual {
        for (uint256 i = 0; i < _p.numOfMints; i++) {
            uint256 timestamp = _p.startTime.add(_p.intervalSpan.mul(i));
            _p.execClaim.conditionPayload = abi.encodeWithSelector(
                IGelatoCondition.ok.selector,
                timestamp
            );
            _p.gelatoCore.mintExecClaim(_p.execClaim, address(0));
        }
    }
}