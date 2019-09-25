pragma solidity ^0.5.10;

import '../../gelato_core/GelatoCore.sol';

contract GTA {
    GelatoCore public gelatoCore;

    constructor(address payable _gelatoCore)
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

    function matchingGelatoCore(address payable _gelatoCore)
        public
        view
        returns(bool)
    {
        if (address(gelatoCore) == _gelatoCore) {
            return true;
        } else {
            return false;
        }
    }

    modifier hasMatchingGelatoCore(address payable _gelatoCore){
        require(matchingGelatoCore(_gelatoCore),
            "GTA.hasMatchingGelatoCore: failed"
        );
        _;
    }
}