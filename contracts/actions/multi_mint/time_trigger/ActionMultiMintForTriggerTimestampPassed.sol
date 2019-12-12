pragma solidity ^0.5.14;

import "../../GelatoActionsStandard.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../../../triggers/IGelatoTrigger.sol";
import "../../../gelato_core/interfaces/IGelatoCore.sol";
import "../../../gelato_core/interfaces/IGelatoCoreAccounting.sol";

contract ActionMultiMintForTriggerTimestampPassed is GelatoActionsStandard {
    using SafeMath for uint256;

    bytes4 constant internal actionSelector = bytes4(keccak256(bytes(
        "action(address,address,address,uint256,address,bytes,uint256,uint256)"
    )));
    uint256 constant internal actionConditionsOkGas = 30000;
    uint256 constant internal actionGas = 1000000;
    uint256 constant internal actionTotalGas = actionConditionsOkGas + actionGas;

    // Overriding GelatoActionsStandard modifier (mandatory)
    modifier actionGasCheck {
        require(
            gasleft() >= actionGas,
            "ActionMultiMintForTriggerTimestampPassed.actionGasCheck: failed"
        );
        _;
    }

    function action(
        // multi mint delegatecall requirement
        address _gelatoCore,
        // gelatoCore.mintExecutionClaim params
        address payable _selectedExecutor,
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
        actionGasCheck
    {
        // We cannot use storage gelatoCore due to delegatecall context
        uint256 mintingDepositPerMint = IGelatoCoreAccounting(
            _gelatoCore
        ).getMintingDepositPayable(
            _selectedExecutor,
            _triggerTimestampPassed,
            _action
        );
        require(msg.value == mintingDepositPerMint.mul(_numberOfMints),
            "MultiMintTimeBased.multiMint: incorrect msg.value"
        );
        for (uint256 i = 0; i < _numberOfMints; i++) {
            uint256 timestamp = _startTime.add(_intervalSpan.mul(i));
            bytes memory triggerPayloadWithSelector = abi.encodeWithSelector(
                _triggerTimestampPassed.getTriggerSelector(),
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

    // Overriding IGelatoAction state readers (mandatory)
    function correctActionSelector() external pure returns(bool) {
        return actionSelector == this.action.selector;
    }
    function getActionSelector() external pure returns(bytes4) {return actionSelector;}
    function getActionConditionsOkGas() external pure returns(uint256) {return actionConditionsOkGas;}
    function getActionGas() external pure returns(uint256) {return actionGas;}
    function getActionTotalGas() external pure returns(uint256) {return actionTotalGas;}
}