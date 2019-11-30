pragma solidity ^0.5.10;

import "../../GelatoActionsStandard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../../../triggers/IGelatoTrigger.sol";

contract ActionMultiMintForTimeTrigger is GelatoActionsStandard {
    using SafeMath for uint256;

    constructor() public {
        actionOperation = ActionOperation.delegatecall;
        actionSelector = this.action.selector;
        actionConditionsOkGas = 30000;
        actionGas = 1000000;
    }

    function action(
        // gelatoCore.mintExecutionClaim params
        address payable _selectedExecutor,
        IGelatoTrigger _timeTrigger,
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
        IGelatoCore gelatoCore = IGelatoCore(0x8AB2E2C1Da789E960C1ac400e5500eC4C61aEac8);
        uint256 mintingDepositPerMint = gelatoCore.getMintingDepositPayable(
            _action,
            _selectedExecutor
        );
        require(msg.value == mintingDepositPerMint.mul(_numberOfMints),
            "MultiMintTimeBased.multiMint: incorrect msg.value"
        );
        for (uint256 i = 0; i < _numberOfMints; i++) {
            uint256 timestamp = _startTime.add(_intervalSpan.mul(i));
            bytes memory triggerPayloadWithSelector = abi.encodeWithSelector(
                _timeTrigger.getTriggerSelector(),
                timestamp
            );
            gelatoCore.mintExecutionClaim.value(mintingDepositPerMint)(
                _selectedExecutor,
                _timeTrigger,
                triggerPayloadWithSelector,
                _action,
                _actionPayloadWithSelector
            );
        }
    }
}