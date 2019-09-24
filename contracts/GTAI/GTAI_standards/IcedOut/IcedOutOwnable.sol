pragma solidity ^0.5.10;

import '../IcedOut.sol';
import '@openzeppelin/contracts/ownership/Ownable.sol';

contract IcedOutOwnable is IcedOut, Ownable {

     constructor(address payable _gelatoCore,
                 uint256 _gtaiGasPrice,
                 uint256 _automaticTopUpAmount
     )
          IcedOut(_gelatoCore, _gtaiGasPrice, _automaticTopUpAmount)
          internal
     {}

     // ___________ ExecutionClaim Pricing __________________________________________
     function _useGTAIGasPrice(uint256 _gtaiGasPrice)
          onlyOwner
          public
     {
          super._useGTAIGasPrice(_gtaiGasPrice);
     }
     function _useGelatoDefaultGasPrice()
          onlyOwner
          public
     {
          super._useGelatoDefaultGasPrice();
     }
     // =========================


     // _________________ Interface Funding Flows ____________________________
     // ___________ GelatoCore <--> Interface ___________
     function _topUpBalanceOnGelato()
          onlyOwner
          public
          payable
     {
          super._topUpBalanceOnGelato();
     }
     function _withdrawBalanceFromGelato(uint256 _withdrawAmount)
          onlyOwner
          public
     {
          super._withdrawBalanceFromGelato(_withdrawAmount);
     }
     // ___________ Interface --> EOA ___________
     function _withdrawBalanceToOwner(uint256 _withdrawAmount)
          onlyOwner
          public
     {
          _withdrawBalanceToSender(_withdrawAmount);
     }
     // ___________ GelatoCore --> Interface --> EOA ___________
     function _withdrawBalanceFromGelatoToOwner(uint256 _withdrawAmount)
          public
     {
          _withdrawBalanceFromGelato(_withdrawAmount);
          _withdrawBalanceToOwner(_withdrawAmount);
     }
     // =========================


     // ___________ Automatic Top Up _______________________________________
     function _setAutomaticTopUpAmount(uint256 _newAmount)
          onlyOwner
          public
     {
          super._setAutomaticTopUpAmount(_newAmount);
     }
     // =========================
}