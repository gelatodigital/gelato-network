pragma solidity ^0.5.10;

import '../../gelato_core/GelatoCore.sol';

contract GTA {
    GelatoCore public gelatoCore;

    constructor(address payable _gelatoCore)
        internal
    {
        gelatoCore = GelatoCore(_gelatoCore);
    }
}