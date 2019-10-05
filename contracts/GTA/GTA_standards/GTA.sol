pragma solidity ^0.5.10;

import '../../gelato_core/GelatoCore.sol';

contract GTA {
    GelatoCore public gelatoCore;

    constructor(address payable _gelatoCore)
        internal
    {
        gelatoCore = GelatoCore(_gelatoCore);
    }

    function _getExecutionClaimOwner(uint256 _executionClaimId)
        internal
        view
        returns(address executionClaimOwner)
    {
        executionClaimOwner = gelatoCore.ownerOf(_executionClaimId);
    }
}