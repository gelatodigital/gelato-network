pragma solidity ^0.5.0;

/**
 * @dev Gelato Dapp Interface standard version 0.
 */

 interface IcedOut {
      // Exposes the execution functions of Gelato Dapp Interfaces.
      function execute(uint256 executionClaimId) external;
 }