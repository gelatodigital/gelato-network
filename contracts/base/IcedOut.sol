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

     uint256 public interfaceGasPrice;

     // GelatoCore
     GelatoCore public gelatoCore;

     // Events
     event LogAddedBalanceToGelato(uint256 indexed weiAmount, uint256 indexed newBalance);


     constructor(address payable _gelatoCore, uint256 _interfaceMaxGas)
          public
     {
          gelatoCore = GelatoCore(_gelatoCore);
          interfaceMaxGas = _interfaceMaxGas;
          interfaceGasPrice = 0;
     }

     // Function to calculate the prepayment an interface needs to transfer to Gelato Core
     // for minting a new execution executionClaim
     function calcGelatoPrepayment()
          public
          view
          returns(uint256 prepayment)
     {
          // msg.sender == dappInterface
          uint256 usedGasPrice;
          // If interfaceGasPrice is set to zero, query gasPrice from core, otherwise use manually setted interfaceGasPrice
          interfaceGasPrice == 0 ? usedGasPrice = gelatoCore.gelatoGasPrice() : usedGasPrice = interfaceGasPrice;
          prepayment = interfaceMaxGas.mul(usedGasPrice);
     }

     // UPDATE BALANCE ON GELATO CORE
     // Add balance
     function addBalanceToGelato()
          public
          payable
          onlyOwner
     {
          gelatoCore.addBalance.value(msg.value)(address(this));
          emit LogAddedBalanceToGelato(msg.value, gelatoCore.getInterfaceBalance(address(this)));
     }

     // Withdraw Balance from gelatoCore to interface
     function withdrawBalanceFromGelato(uint256 _withdrawAmount)
          public
          onlyOwner
          returns(bool success)
     {
          gelatoCore.withdrawBalance(_withdrawAmount);
          success = true;
     }

     // Withdraw funds from interface to owner
     function withdrawBalanceToOwner(uint256 _withdrawAmount)
          public
          onlyOwner
          returns(bool success)
     {
          msg.sender.transfer(_withdrawAmount);
          success = true;
     }

     // Withdraw funds from interface to owner
     function withdrawBalanceFromGelatoToOwner(uint256 _withdrawAmount)
          public
          onlyOwner
          returns(bool success)
     {
          withdrawBalanceFromGelato(_withdrawAmount);
          withdrawBalanceToOwner(_withdrawAmount);
          success = true;
     }

     // Mint new execution claims in core
     function mintClaim(address _user, bytes memory payload)
          internal
     {
          // executionClaimId = gelatoCore.getCurrentExecutionClaimId().add(1)
          gelatoCore.mintExecutionClaim(payload, _user);
     }

     function getNextExecutionClaimId()
          internal
          view
          returns(uint256)
     {
          return gelatoCore.getCurrentExecutionClaimId().add(1);
     }

     // Check time condition
     function checkTimeCondition(uint256 _executionTime)
          internal
          view
     {
          require(_executionTime <= now,
            "IcedOut Time Condition: Function called scheduled execution time"
          );
     }

     // IF interface balance is below 0.5 ETH on gelato Core, add all of the ETH in interface as new balance in gelato core
     function automaticTopUp()
          internal
          returns (bool addedBalance)
     {
          // Fetch interface eth balance on gelato core
          uint256 interfaceGelatoBalance = gelatoCore.getInterfaceBalance(address(this));
          // If interface balance is less than 0.5 on core, topup the balance
          if ( interfaceGelatoBalance < 1 ether )
          {
               // Fetch current interface eth balance
               uint256 interfaceEthBalance = address(this).balance;
               // Add this balance to gelatoCore
               gelatoCore.addBalance.value(interfaceEthBalance)(address(this));
               // Emit event
               emit LogAddedBalanceToGelato(interfaceEthBalance, gelatoCore.getInterfaceBalance(address(this)));
               // return success == true
               return true;
          }
          return false;
     }

     // Switch from querying gelatoCore's gas price to using an interface specific one
     function useIndividualGasPrice(uint256 _interfaceGasPrice)
          public
          onlyOwner
     {
          require(_interfaceGasPrice != 0, "New interface Gas Price must be non zero");
          interfaceGasPrice = _interfaceGasPrice;
     }

     // Switch from using interface specific gasPrice to fetching it from gelato core
     function useGelatoGasPrice()
          public
          onlyOwner
     {
          interfaceGasPrice = 0;
     }

     // Fallback function: reverts incoming ether payments not addressed to a payable function
     function() external payable {
        require(msg.sender == address(gelatoCore), "Should not send ether to GelatoDutchX without specifying a payable function selector, except when coming from gelatoCore");
    }

}