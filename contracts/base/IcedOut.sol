pragma solidity ^0.5.8;

// Imports
import '../GelatoCore.sol';
import './Ownable.sol';
import './SafeMath.sol';

/**
* @dev Gelato Dapp Interface Standard version 0.
*/

contract IcedOut is Ownable {

     using SafeMath for uint256;

     // Max Gas for one execute + withdraw pair => fixed.
     uint256 public interfaceMaxGas;
     // To adjust prePayment, use gasPrice
     uint256 public interfaceGasPrice;

     // GelatoCore
     GelatoCore public gelatoCore;

     // Events
     event LogGelatoBalanceAdded(uint256 amount,
                                 uint256 gelatoBalancePost,
                                 uint256 interfaceBalancePost
     );
     event LogGelatoBalanceWithdrawn(uint256 amount,
                                     uint256 gelatoBalancePost,
                                     uint256 interfaceBalancePost
     );
     event LogBalanceWithdrawnToOwner(uint256 amount,
                                      uint256 interfaceBalancePost,
                                      uint256 ownerBalancePost
     );

     constructor(address payable _gelatoCore, uint256 _interfaceMaxGas, uint256 _interfaceGasPrice)
          public
     {
          gelatoCore = GelatoCore(_gelatoCore);
          interfaceMaxGas = _interfaceMaxGas;
          interfaceGasPrice = _interfaceGasPrice;
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
          // 0 flags default GelatoCore gasPrice configuration
          interfaceGasPrice == 0 ? usedGasPrice = gelatoCore.recommendedGasPriceForInterfaces() : usedGasPrice = interfaceGasPrice;
          prepayment = interfaceMaxGas.mul(usedGasPrice);
     }

     // UPDATE BALANCE ON GELATO CORE
     // Add balance
     function addBalanceToGelato()
          public
          payable
          onlyOwner
     {
          gelatoCore.addInterfaceBalance.value(msg.value)();
          emit LogGelatoBalanceAdded(msg.value,
                                     gelatoCore.interfaceBalances(address(this)),
                                     address(this).balance
          );
     }

     // Withdraw Balance from gelatoCore to interface
     function withdrawBalanceFromGelato(uint256 _withdrawAmount)
          public
          onlyOwner
     {
          gelatoCore.withdrawInterfaceBalance(_withdrawAmount);
          emit LogGelatoBalanceWithdrawn(_withdrawAmount,
                                         gelatoCore.interfaceBalances(address(this)),
                                         address(this).balance
          );
     }

     // Withdraw funds from interface to owner
     function withdrawBalanceToOwner(uint256 _withdrawAmount)
          public
          onlyOwner
     {
          msg.sender.transfer(_withdrawAmount);
          emit LogBalanceWithdrawnToOwner(_withdrawAmount,
                                          address(this).balance,
                                          msg.sender.balance  // owner balance post
          );
     }

     // Withdraw funds from interface to owner
     function withdrawBalanceFromGelatoToOwner(uint256 _withdrawAmount)
          public
          onlyOwner
     {
          withdrawBalanceFromGelato(_withdrawAmount);
          withdrawBalanceToOwner(_withdrawAmount);
     }

     // Create function signature from canonical form and execution claim
     function mintExecutionClaim(string memory _function, address _user)
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
            "IcedOut.checkTimeCondition: ExecutionTime must be >= now"
          );
     }

     // IF interface balance is below 0.5 ETH on gelato Core,
     //  add all of the ETH in interface as new balance in gelato core
     function automaticTopUp()
          internal
     {
          // Fetch interface eth balance on gelato core
          uint256 interfaceGelatoBalance = gelatoCore.interfaceBalances(address(this));
          // If interface balance is less than minInterfaceBalance, topup the balance
          if (interfaceGelatoBalance < gelatoCore.minInterfaceBalance())
          {
               // Fetch current interface eth balance
               uint256 interfaceEthBalance = address(this).balance;
               // Add this balance to gelatoCore
               gelatoCore.addInterfaceBalance.value(interfaceEthBalance)();
               // Emit event
               emit LogGelatoBalanceAdded(interfaceEthBalance,
                                          gelatoCore.interfaceBalances(address(this)),
                                          address(this).balance
               );
          }
     }

     // Switch from querying gelatoCore's gas price to using an interface specific one
     function useInterfaceGasPrice(uint256 _interfaceGasPrice)
          public
          onlyOwner
     {
          require(_interfaceGasPrice != 0,
               "IcedOut.useInterfaceGasPrice: New interface Gas Price must be non zero"
          );
          interfaceGasPrice = _interfaceGasPrice;
     }

     // Switch from using interface specific gasPrice to fetching it from gelato core
     function useRecommendedGasPrice()
          public
          onlyOwner
     {
          interfaceGasPrice = 0;
     }

     // Fallback function: reverts incoming ether payments not addressed to a payable function
     function() external payable {
          require(msg.sender == address(gelatoCore),
               "IcedOut.fallback: Should not send ether to IcedOut without specifying a payable function selector, except when coming from gelatoCore"
          );
    }
}