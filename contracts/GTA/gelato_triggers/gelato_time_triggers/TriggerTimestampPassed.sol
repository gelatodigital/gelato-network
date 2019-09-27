pragma solidity ^0.5.10;

import '../gelato_trigger_standards/GelatoTriggersStandard.sol';

contract TriggerTimestampPassed is GelatoTriggersStandard {

    constructor(address payable _gelatoCore)
        public
        GelatoTriggersStandard(_gelatoCore, "fired(uint256)")
    {}

    function fired(uint256 _timestamp)
        public
        view
        returns(bool)
    {
        _triggerChecks();
        return _timestamp <= now;
    }

    function getLatestTimestamp()
        public
        view
        returns(uint256)
    {
        return block.timestamp;
    }

}