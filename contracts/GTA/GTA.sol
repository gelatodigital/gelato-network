pragma solidity ^0.5.10;

import '../gelato_core/GelatoCore.sol';

contract GTA {
    GelatoCore public gelatoCore;

    constructor(address _gelatoCore)
        internal
    {
        gelatoCore = GelatoCore(_gelatoCore);
    }

    modifier onlyGelatoCore() {
        require(msg.sender == address(gelatoCore),
            "GelatoTriggersStandard.onlyGelatoCore failed"
        );
        _;
    }

    function matchingGelatoCore(address _gelatoCore)
        public
        view
        returns(bool)
    {
        if (gelatoCore == _gelatoCore) {
            return true;
        } else {
            return false;
        }
    }
}