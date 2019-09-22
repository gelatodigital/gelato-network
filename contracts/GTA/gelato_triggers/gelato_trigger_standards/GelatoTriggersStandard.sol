pragma solidity ^0.5.10;

import '../../GTA.sol';
import './IGelatoTrigger.sol';

contract GelatoTriggersStandard is GTA, IGelatoTrigger {
    bytes4 public triggerSelector;

    constructor(address _gelatoCore,
                string _triggerSignature
    )
        GTA(address _gelatoCore)
        internal
    {
        triggerSelector = bytes4(keccak256(bytes(_triggerSignature)));
    }

    modifier correctTriggerSelector() {
        require(bytes4(msg.data) == triggerSelector,
            "GelatoTriggersStandard.correctTriggerSelector failed"
        );
        _;
    }

    function _triggerChecks()
        onlyGelatoCore
        correctTriggerSelector
        internal
        view
    {}

    function matchingTriggerSelector(bytes4 _triggerSelector)
        public
        view
        returns(bool)
    {
        if (triggerSelector == _triggerSelector) {
            return true;
        } else {
            return false;
        }
    }

}