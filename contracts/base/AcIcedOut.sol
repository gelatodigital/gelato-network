pragma solidity ^0.5.0;

import './IcedOut.sol';

/**
 * @dev Implementation of the `IGEI0` interface.
 */

 contract AcIcedOut is IcedOut {
     /**
      @dev Exposes the execution functions of Gelato Interfaces.
      */
      function execute(uint256 executionClaimId) external;
 }