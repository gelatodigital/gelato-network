pragma solidity ^0.5.10;

import './IcedOut.sol';
import '@openzeppelin/contracts/ownership/Ownable.sol';

contract IcedOutOwnable is Ownable, IcedOut {

     constructor(address payable _gelatoCore,
                 uint256 _executionClaimLifetime,
                 uint256 _gtaiGasPrice,
                 uint256 _automaticTopUpAmount
     )
          IcedOut(_gelatoCore,
                  _executionClaimLifetime,
                  _gtaiGasPrice,
                  _automaticTopUpAmount
          )
          internal
     {}

     // _________________ ExecutionClaim Expiration Time ____________________
     function setExecutionClaimLifespan(uint256 _lifespan)
          onlyOwner
          public
     {
          _setExecutionClaimLifespan(_lifespan);
     }
     // =========================

     // ___________ ExecutionClaim Pricing __________________________________________
     function setGTAIGasPrice(uint256 _gtaiGasPrice)
          onlyOwner
          public
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
          public
          payable
     {
          _topUpBalanceOnGelato();
     }
     function withdrawBalanceFromGelato(uint256 _withdrawAmount)
          onlyOwner
          public
     {
          _withdrawBalanceFromGelato(_withdrawAmount);
     }
     // ___________ Interface --> EOA ___________
     function withdrawBalanceToOwner(uint256 _withdrawAmount)
          onlyOwner
          public
     {
          _withdrawBalanceToSender(_withdrawAmount);
     }
     // ___________ GelatoCore --> Interface --> EOA ___________
     function withdrawBalanceFromGelatoToOwner(uint256 _withdrawAmount)
          public
     {
          withdrawBalanceFromGelato(_withdrawAmount);
          withdrawBalanceToOwner(_withdrawAmount);
     }
     // =========================


     // ___________ Automatic Top Up _______________________________________
     function setAutomaticTopUpAmount(uint256 _newAmount)
          onlyOwner
          public
     {
          _setAutomaticTopUpAmount(_newAmount);
     }
     // =========================
}