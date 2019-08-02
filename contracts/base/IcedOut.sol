pragma solidity ^0.5.8;

// Imports
import './SafeMath.sol';
import '../GelatoCore.sol';
import './Ownable.sol';

/**
* @dev Gelato Dapp Interface standard version 0.
*/

contract IcedOut is Ownable {

     using SafeMath for uint256;

     // Max Gas for one execute + withdraw pair => fixed. To adjust prePayment, use gasPrice
     uint256 public interfaceMaxGas;

     // GelatoCore
     GelatoCore public gelatoCore;

     // Events
     event LogAddedBalanceToGelato(uint256 indexed weiAmount, uint256 indexed newBalance);


     constructor(address payable _gelatoCore, uint256 _interfaceMaxGas)
          public
     {
          gelatoCore = GelatoCore(_gelatoCore);
          interfaceMaxGas = _interfaceMaxGas;
     }

     // Function to calculate the prepayment an interface needs to transfer to Gelato Core
     //  for minting a new execution executionClaim
     function calcGelatoPrepaidExecutionFee()
          public
          view
          returns(uint256 prepayment)
     {
          // msg.sender == dappInterface
          prepayment = interfaceMaxGas.mul(gelatoCore.getGelatoGasPrice());
     }

     // UPDATE BALANCE ON GELATO CORE
     // Add balance
     function addBalanceToGelato()
          public
          payable
          onlyOwner
     {
          gelatoCore.addBalance.value(msg.value)();
          emit LogAddedBalanceToGelato(msg.value, gelatoCore.getInterfaceBalance(address(this)));
     }

     // Withdraw Balance
     function withdrawBalanceFromGelato(uint256 _withdrawAmount)
          public
          onlyOwner
     {
          gelatoCore.withdrawBalance(_withdrawAmount);
     }

     // Create function signaure from canonical form and execution claim
     function mintClaim(string memory _function, address _user)
          public
          returns (uint256 executionClaimId, bytes memory functionSignature)
     {
          executionClaimId = gelatoCore.getCurrentExecutionClaimId().add(1);
          functionSignature = abi.encodeWithSignature(_function, executionClaimId);
          gelatoCore.mintExecutionClaim(functionSignature, _user);
     }

     // Check time condition
     function checkTimeCondition(uint256 _executionTime)
          internal
          view
     {
          require(_executionTime <= now,
            "gelatoCore.execute: You called before scheduled execution time"
          );
     }

}