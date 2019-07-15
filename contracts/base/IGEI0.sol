pragma solidity ^0.5.0;

/**
 * @dev Interface of the GelatoExecutionInterface (IGEI) standard version 0.
 */

 interface IGEI0 {
     /**
      @dev Exposes the execution functions of Gelato Interfaces.
      */
      function execute(uint256 executionClaimId) external returns (bool);
 }