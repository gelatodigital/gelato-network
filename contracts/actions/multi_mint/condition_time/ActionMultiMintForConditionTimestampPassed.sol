pragma solidity ^0.6.2;

import "../../GelatoActionsStandard.sol";
import "../../../external/SafeMath.sol";
import "../../../conditions/IGelatoCondition.sol";
import "../../../gelato_core/interfaces/IGelatoCore.sol";

// CAUTION this contract is not up to date with Action standards due to missing return values
//  (GelatoCore.Enums.ExecutionResult, uint8 reason) - not possible due to stack too deep
contract ActionMultiMintForConditionTimestampPassed is GelatoActionsStandard {
    using SafeMath for uint256;

    // actionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() external pure override returns(bytes4) {
        return this.action.selector;
    }
    uint256 public constant override actionGas = 1000000;

    // Caution when using storage in delegatecall
    function action(
        // multi mint delegatecall requirement
        address _gelatoCore,
        // gelatoCore.mintExecutionClaim params
        address[2] calldata _providerAndExecutor,
        IGelatoCondition _conditionTimestampPassed,
        uint256 _startTime,  // will be encoded here
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        uint256 _executionClaimExpiryDate,
        // MultiMintTimeBased params
        uint256 _intervalSpan,
        uint256 _numberOfMints
    )
        external
        payable
    {
        for (uint256 i = 0; i < _numberOfMints; i++) {
            uint256 timestamp = _startTime.add(_intervalSpan.mul(i));
            bytes memory conditionPayload = abi.encodeWithSelector(
                _conditionTimestampPassed.conditionSelector(),
                timestamp
            );
            IGelatoCore(_gelatoCore).mintExecutionClaim(
                _providerAndExecutor,
                _conditionTimestampPassed,
                conditionPayload,
                _action,
                _actionPayloadWithSelector,
                _executionClaimExpiryDate
            );
        }
    }
}