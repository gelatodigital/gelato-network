pragma solidity ^0.5.10;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../../../gelato_core/IGelatoCore.sol";
import "../../../triggers_actions/triggers/IGelatoTrigger.sol";

contract MultiMintForTimeTriggerRinkeby
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
                = IGelatoCore(0x501aF774Eb578203CC34E7171273124A93706C06);
            uint256 mintingDepositPerMint
                = gelatoCore.getMintingDepositPayable(_action, _selectedExecutor);
            require(msg.value == mintingDepositPerMint.mul(_numberOfMints),
                "MultiMintTimeBased.multiMint: incorrect msg.value"
            );
            for (uint256 i = 0; i < _numberOfMints; i++)
            {
                uint256 timestamp = _startTime.add(_intervalSpan.mul(i));
                bytes memory triggerPayload
                    = abi.encodeWithSelector(
                        IGelatoTrigger(_timeTrigger).getTriggerSelector(),
                        timestamp
                );
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