pragma solidity ^0.5.0;

import './IGEI0.sol';

/**
 * @dev Implementation of the `IGEI0` interface.
 */

 contract GEI0 is IGEI0 {
     /**
      @dev Exposes the execution functions of Gelato Interfaces.
      */
      function execute(uint256 executionClaimId) external returns (bool);
 }