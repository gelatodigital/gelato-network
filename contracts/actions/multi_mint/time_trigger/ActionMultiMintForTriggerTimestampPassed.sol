pragma solidity ^0.6.0;

import "../../GelatoActionsStandard.sol";
import "../../../external/SafeMath.sol";
import "../../../triggers/IGelatoTrigger.sol";
import "../../../gelato_core/interfaces/IGelatoCore.sol";
import "../../../gelato_core/interfaces/IGelatoCoreAccounting.sol";

contract ActionMultiMintForTriggerTimestampPassed is GelatoActionsStandard {
    using SafeMath for uint256;

    // actionSelector public state variable np due to this.actionSelector constant issue
    function actionSelector() external pure override returns(bytes4) {
        return this.action.selector;
    }
    uint256 public constant override actionConditionsCheckGas = 30000;
    uint256 public constant override actionGas = 1000000;
    uint256 public constant override actionTotalGas = actionConditionsCheckGas + actionGas;

    // Caution when using storage in delegatecall
    function action(
        // multi mint delegatecall requirement
        address _gelatoCore,
        // gelatoCore.mintExecutionClaim params
        address _selectedExecutor,
        IGelatoTrigger _triggerTimestampPassed,
        uint256 _startTime,  // will be encoded here
        IGelatoAction _action,
        bytes calldata _actionPayloadWithSelector,
        // MultiMintTimeBased params
        uint256 _intervalSpan,
        uint256 _numberOfMints
    )
        external
        payable
    {
        uint256 mintingDepositPerMint = IGelatoCoreAccounting(
            _gelatoCore
        ).getMintingDepositPayable(
            _selectedExecutor,
            _triggerTimestampPassed,
            _action
        );

        require(
            msg.value == mintingDepositPerMint.mul(_numberOfMints),
            "MultiMintTimeBased.multiMint: incorrect msg.value"
        );

        for (uint256 i = 0; i < _numberOfMints; i++) {
            uint256 timestamp = _startTime.add(_intervalSpan.mul(i));
            bytes memory triggerPayloadWithSelector = abi.encodeWithSelector(
                _triggerTimestampPassed.triggerSelector(),
                timestamp
            );
            IGelatoCore(_gelatoCore).mintExecutionClaim.value(mintingDepositPerMint)(
                _selectedExecutor,
                _triggerTimestampPassed,
                triggerPayloadWithSelector,
                _action,
                _actionPayloadWithSelector
            );
        }
    }
}