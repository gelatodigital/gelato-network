pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import "../../GelatoActionsStandard.sol";
import "../../../external/SafeMath.sol";
import "../../../gelato_conditions/IGelatoCondition.sol";
import "../../../gelato_conditions/eth_utils/eth_time/ConditionTimestampPassed.sol";
import { IGelatoCore, ExecClaim } from "../../../gelato_core/interfaces/IGelatoCore.sol";

// CAUTION this contract is not up to date with Action standards due to missing return values
//  (GelatoCore.Enums.ExecutionResult, uint8 reason) - not possible due to stack too deep
contract ActionMultiMintForConditionTimestampPassed is GelatoActionsStandard {
    using SafeMath for uint256;

    // actionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() external pure override returns(bytes4) {
        return this.action.selector;
    }

    // Caution when using storage in delegatecall
    function action(
        // multi mint delegatecall requirement
        IGelatoCore _gelatoCore,
        // gelatoCore.mintExecClaim params
        address _executor,
        ExecClaim memory _execClaim,
        uint256 _startTime,  // will be encoded here
        // MultiMintTimeBased params
        uint256 _intervalSpan,
        uint256 _numberOfMints
    )
        public
        payable
    {
        for (uint256 i = 0; i < _numberOfMints; i++) {
            uint256 timestamp = _startTime.add(_intervalSpan.mul(i));
            _execClaim.conditionPayload = abi.encodeWithSelector(
                ConditionTimestampPassed.ok.selector,
                timestamp
            );
            _gelatoCore.mintExecClaim(_executor, _execClaim);
        }
    }
}