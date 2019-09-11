pragma solidity ^0.5.10;

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

     function decodeWithFunctionSignature(bytes memory _memPayload)
        internal
        pure
        returns(bytes memory, bytes4)
    {

        // Create bytes4 array to store the keccakHash of the funcSelector in
        bytes4 funcSelector;
        assembly {
            // Aim: We put the funcSelector on the stack to access it outside of assembly
            // How: Get the pointer of the payload in memory (== memPayload) and add 32 bytes (==0x20 hex) to point to where the actual data of the function selector lies, skipping the length bit (always first 32 bytes).
            // Bind this pointer to funcSelector, which when using it in solidity ignores the encoded data which comes directly after the first word (functionSelector == bytes4)
            // In short: Read the first 32 bytes by loading the word that starts at memory location memPayload + 32 bytes (==0x20 hex) and bind to funcSelector
            funcSelector := mload(add(0x20, _memPayload))

            // Aim: Get rid of the funcSelector Data
            // How: Load the first word of the memPayload array (== length of the data) and subtract it by 4
            // Then store this updated length which got rid of the first 4 bytes (== funcSelector) at memory location memPayload + 4
            // Mstore: Store the word derived in the second parameter at the location specified by the first parameter
            // Q: Does sub(mload(memPayload), 4) update the word that stores the length of the data, which automatically prunes the first 4 bytes of the part that stores the data?
            mstore(
                // At position memPayload + 4
                add(_memPayload, 4),
                // Load the first word of the memPayload bytes array == length of the bytes and deduct it by 4
                sub(mload(_memPayload), 4)
            )
            // Skip the first 4 bytes (function signature)
            // Overwrite memPayload by binding the memory pointer of memPayload + 4 to key memPayload
            _memPayload := add(_memPayload, 4)

        }
        return (_memPayload, funcSelector);
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
     function mintClaim(address _triggerAddress, bytes memory _triggerPayload, address _actionAddress, bytes memory _actionPayload, uint256 _actionMaxGas, address _executionClaimOwner)
          internal
     {
          /*
          address _triggerAddress,
                                bytes calldata _triggerPayload,
                                address _actionAddress,
                                bytes calldata _actionPayload,
                                uint256 _actionMaxGas,
                                address _executionClaimOwner
          */
          // executionClaimId = gelatoCore.getCurrentExecutionClaimId().add(1)
          gelatoCore.mintExecutionClaim(_triggerAddress, _triggerPayload, _actionAddress, _actionPayload, _actionMaxGas, _executionClaimOwner);
          // gelatoCore.mintExecutionClaim(payload, _user, _executionGas);
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