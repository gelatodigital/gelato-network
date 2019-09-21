pragma solidity ^0.5.10;

import './IGelatoTrigger.sol';
import '../../gelato_core/GelatoCore.sol';

contract GelatoTriggersStandard is IGelatoTrigger {
    GelatoCore public gelatoCore;
    bytes4 public triggerSelector;

    constructor(address _gelatoCore,
                string _triggerSignature
    )
        internal
    {
        gelatoCore = GelatoCore(_gelatoCore);
        triggerSelector = bytes4(keccak256(bytes(_triggerSignature)));
    }

    function matchingGelatoCore(address _gelatoCore)
        external
        view
        returns(bool)
    {
        if (gelatoCore == _gelatoCore) {
            return true;
        } else {
            return false;
        }
    }

    modifier onlyGelatoCore() {
        require(msg.sender == address(gelatoCore),
            "GelatoTriggersStandard.onlyGelatoCore failed"
        );
        _;
    }

    modifier correctSelector() {
        require(bytes4(msg.data) == triggerSelector,
            "GelatoTriggersStandard.correctSelector failed"
        );
        _;
    }

    function _triggerChecks()
        onlyGelatoCore
        correctSelector
        internal
        view
    {}
}