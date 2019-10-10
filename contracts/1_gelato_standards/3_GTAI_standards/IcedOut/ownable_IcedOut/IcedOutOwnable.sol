pragma solidity ^0.5.10;

import '@openzeppelin/contracts/ownership/Ownable.sol';
import './IIcedOutOwnable.sol';
import '../IcedOut.sol';

contract IcedOutOwnable is Ownable,
                           IIcedOutOwnable,
                           IcedOut
{
     constructor(address payable _gelatoCore,
                 uint256 _gtaiGasPrice
     )
          IcedOut(_gelatoCore,
                  _gtaiGasPrice
          )
          internal
     {}

     // _________________ ExecutionClaim Expiration Time ____________________
     function selectExecutor(address payable _executor)
          onlyOwner
          external
     {
          _selectExecutor(_executor);
     }
     // =========================

     // ___________ ExecutionClaim Pricing __________________________________________
     function setGTAIGasPrice(uint256 _gtaiGasPrice)
          onlyOwner
          external
     {
          _setGTAIGasPrice(_gtaiGasPrice);
     }
     // =========================


     // _________________ Interface Funding Flows ____________________________
     // ___________ GelatoInterface <-- EOA ___________
     function acceptEther()
          onlyOwner
          external
          payable
     {}
     // ___________ GelatoCore <--> Interface ___________
     function topUpBalanceOnGelato()
          onlyOwner
          external
          payable
     {
          _topUpBalanceOnGelato(msg.value);
     }
     function withdrawBalanceFromGelato(uint256 _withdrawAmount)
          onlyOwner
          external
     {
          _withdrawBalanceFromGelato(_withdrawAmount);
     }
     // ___________ Interface --> EOA ___________
     function withdrawBalanceToOwner(uint256 _withdrawAmount)
          onlyOwner
          external
     {
          _withdrawBalanceToSender(_withdrawAmount);
     }
     // ___________ GelatoCore --> Interface --> EOA ___________
     function withdrawBalanceFromGelatoToOwner(uint256 _withdrawAmount)
          onlyOwner
          external
     {
          _withdrawBalanceFromGelato(_withdrawAmount);
          _withdrawBalanceToSender(_withdrawAmount);
     }
     // =========================
}