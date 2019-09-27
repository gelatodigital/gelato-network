pragma solidity ^0.5.10;

import '../../GTA_standards/GTA.sol';

contract GelatoTriggersStandard is GTA {
    bytes4 public triggerSelector;

    constructor(address payable _gelatoCore,
                string memory _triggerSignature
    )
        GTA(_gelatoCore)
        internal
    {
        triggerSelector = bytes4(keccak256(bytes(_triggerSignature)));
    }

    modifier correctTriggerSelector() {
        bytes4 _triggerSelector;
        assembly {
            _triggerSelector := mload(add(0x20, calldataload(0)))
        }
        require(_triggerSelector == triggerSelector,
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