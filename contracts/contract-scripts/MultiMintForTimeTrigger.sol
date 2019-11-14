pragma solidity ^0.5.10;

import '@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol';
import '../interfaces/IGelatoCore.sol';
import '../interfaces/triggers_actions_interfaces/IGelatoTrigger.sol';

contract MultiMintForTimeTrigger
{
    using SafeMath for uint256;

    function multiMint(// gelatoCore.mintExecutionClaim params
                       address _timeTrigger,
                       uint256 _startTime,  // will be encoded here
                       address _action,
                       bytes calldata _actionPayload,
                       address payable _selectedExecutor,
                       // MultiMintTimeBased params
                       uint256 _intervalSpan,
                       uint256 _numberOfMints
    )
            external
            payable
        {
            IGelatoCore gelatoCore
                = IGelatoCore(0x84Ea81AD0EF5Aa3c6Aa051c76B5af6E946F88C4E);
            uint256 mintingDepositPerMint
                = gelatoCore.getMintingDepositPayable(_action, _selectedExecutor);
            require(msg.value == mintingDepositPerMint.mul(_numberOfMints),
                "MultiMintTimeBased.multiMint: incorrect msg.value"
            );
            for (uint256 i = 0; i < _numberOfMints; i++)
            {
                _startTime = _startTime.add(_intervalSpan.mul(i));
                bytes4 triggerSelector = IGelatoTrigger(_timeTrigger).getTriggerSelector();
                bytes memory triggerPayload = abi.encodeWithSelector(triggerSelector, _startTime);
                gelatoCore.mintExecutionClaim
                          .value(mintingDepositPerMint)
                          (_timeTrigger,
                           triggerPayload,
                           _action,
                           _actionPayload,
                           _selectedExecutor
                );
            }
        }
}