pragma solidity ^0.5.10;


/**
* @dev Gelato Dapp Interface standard
*/

contract IIcedOut {


     // Events
     event LogAddedBalanceToGelato(uint256 indexed weiAmount, uint256 indexed newBalance);


     constructor(address payable _gelatoCore, uint256 _interfaceMaxGas)
          public
     {

     }

     function decodeWithFunctionSignature(bytes memory _payload)
        internal
        pure
        returns(bytes memory, bytes4) {}


    function acceptExecutionRequest(
            bytes calldata payload
        )
        external
        view
        returns (uint256);

     // Function to calculate the prepayment an interface needs to transfer to Gelato Core
     // for minting a new execution executionClaim
     function calcGelatoPrepayment()
          public
          view
          returns(uint256 prepayment)
     {

     }

     // UPDATE BALANCE ON GELATO CORE
     // Add balance
     function addBalanceToGelato()
          public
          payable
     {
     }

     // Withdraw Balance from gelatoCore to interface
     function withdrawBalanceFromGelato(uint256 _withdrawAmount)
          public
          returns(bool success)
     {

     }

     // Withdraw funds from interface to owner
     function withdrawBalanceToOwner(uint256 _withdrawAmount)
          public
          returns(bool success)
     {

     }

     // Withdraw funds from interface to owner
     function withdrawBalanceFromGelatoToOwner(uint256 _withdrawAmount)
          public
          returns(bool success)
     {
     }

     // Create function signaure from canonical form and execution claim
     function mintClaim(address _triggerAddress, bytes memory _triggerPayload, address _actionAddress, bytes memory _actionPayload, uint256 _actionMaxGas, address _executionClaimOwner)
          internal
     {
     }

     function getNextExecutionClaimId()
          internal
          view
          returns(uint256)
     {
     }

     // Check time condition
     function checkTimeCondition(uint256 _executionTime)
          internal
          view
     {
     }

     // IF interface balance is below 0.5 ETH on gelato Core, add all of the ETH in interface as new balance in gelato core
     function automaticTopUp()
          internal
          returns (bool addedBalance)
     {

     }

     // Switch from querying gelatoCore's gas price to using an interface specific one
     function useIndividualGasPrice(uint256 _interfaceGasPrice)
          public
     {
     }

     // Switch from using interface specific gasPrice to fetching it from gelato core
     function useGelatoGasPrice()
          public
     {
     }

     // Fallback function: reverts incoming ether payments not addressed to a payable function
     function() external {
    }
}