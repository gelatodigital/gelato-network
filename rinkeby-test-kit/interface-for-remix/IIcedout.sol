pragma solidity ^0.5.0;

/**
* @dev Gelato Dapp Interface Standard version 0.
*/

interface IIcedOut {

     // Max Gas for one execute + withdraw pair => fixed.
     function interfaceMaxGas() external view returns(uint256);
     // To adjust prePayment, use gasPrice
     function interfaceGasPrice() external view returns(uint256);

     function gelatoCore() external view returns(address);

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


     // Function to calculate the prepayment an interface needs to transfer to Gelato Core
     // for minting a new execution executionClaim
     function calcGelatoPrepayment() external view returns(uint256);

     // UPDATE BALANCE ON GELATO CORE
     // Add balance
     function addBalanceToGelato() external payable;

     // Withdraw Balance from gelatoCore to interface
     function withdrawBalanceFromGelato(uint256 _withdrawAmount) external;
     // Withdraw funds from interface to owner
     function withdrawBalanceToOwner(uint256 _withdrawAmount) external;

     // Withdraw funds from interface to owner
     function withdrawBalanceFromGelatoToOwner(uint256 _withdrawAmount) external;


     // Create function signature from canonical form and execution claim
     function mintExecutionClaim(string calldata _function, address _user) external returns (uint256, bytes memory);

     // Switch from querying gelatoCore's gas price to using an interface specific one
     function useInterfaceGasPrice(uint256 _interfaceGasPrice) external;

     // Switch from using interface specific gasPrice to fetching it from gelato core
     function useRecommendedGasPrice() external;
}