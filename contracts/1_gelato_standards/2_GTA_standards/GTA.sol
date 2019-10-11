pragma solidity ^0.5.10;

import '../../2_gelato_core/GelatoCore.sol';

contract GTA {
    GelatoCore internal gelatoCore;

    function getGelatoCore() external returns(address) {return address(gelatoCore);}

    constructor(address payable _gelatoCore)
        internal
    {
        gelatoCore = GelatoCore(_gelatoCore);
    }

    function _getUser(uint256 _executionClaimId)
        internal
        view
        returns(address user)
    {
        user = gelatoCore.ownerOf(_executionClaimId);
    }
}