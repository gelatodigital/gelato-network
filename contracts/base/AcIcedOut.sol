pragma solidity ^0.5.0;

import './IcedOut.sol';

/**
 * @dev Implementation of the `IcedOut` interface.
 */

 contract AcIcedOut is IcedOut {
    // Exposes the execution functions of Gelato Interfaces.
    function execute(uint256 executionClaimId) external;
 }