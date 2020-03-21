pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import { GelatoActionsStandard } from "../../GelatoActionsStandard.sol";
import { SafeMath } from "../../../external/SafeMath.sol";
import { IGelatoCondition } from "../../../gelato_conditions/IGelatoCondition.sol";
import { IGelatoCore, ExecClaim } from "../../../gelato_core/interfaces/IGelatoCore.sol";

// CAUTION this contract is not up to date with Action standards due to missing return values
//  (GelatoCore.Enums.ExecutionResult, uint8 reason) - not possible due to stack too deep
contract ActionMultiMintForConditionTimestampPassed is GelatoActionsStandard {

    using SafeMath for uint256;

    function action(bytes calldata _actionPayload) external payable override virtual {
        (IGelatoCore gelatoCore,
         address executor,
         ExecClaim memory execClaim,
         uint256 startTime,
         uint256 intervalSpan,
         uint256 numOfMints) = abi.decode(
             _actionPayload[4:],
             (IGelatoCore,address,ExecClaim,uint256,uint256,uint256)
         );
         action(gelatoCore, executor, execClaim, startTime, intervalSpan, numOfMints);
    }

    // Specific Implementation: Caution when using storage in delegatecall
    function action(
        // multi mint delegatecall requirement
        IGelatoCore _gelatoCore,
        // gelatoCore.mintExecClaim params
        address _executor,
        ExecClaim memory _execClaim,
        uint256 _startTime,  // will be encoded here
        // MultiMintTimeBased params
        uint256 _intervalSpan,
        uint256 _numOfMints
    )
        public
        payable
        virtual
    {
        for (uint256 i = 0; i < _numOfMints; i++) {
            uint256 timestamp = _startTime.add(_intervalSpan.mul(i));
            _execClaim.conditionPayload = abi.encodeWithSelector(
                IGelatoCondition.ok.selector,
                timestamp
            );
            _gelatoCore.mintExecClaim(_executor, _execClaim);
        }
    }
}