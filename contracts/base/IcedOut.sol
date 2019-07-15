pragma solidity ^0.5.0;

/**
 * @dev Gelato Dapp Interface standard version 0.
 */

 interface IcedOut {
     /**
      @dev Exposes the execution functions of Gelato Dapp Interfaces.
      */
      function execute(uint256 executionClaimId) external;
 }