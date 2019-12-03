pragma solidity ^0.5.13;

import "../GelatoTriggersStandard.sol";

contract TriggerTimestampPassed is GelatoTriggersStandard {
    constructor() public {
        triggerSelector = this.fired.selector;
        triggerGas = 30000;
    }

    function fired(uint256 _timestamp)
        external
        view
        returns(bool)
    {
        return _timestamp <= block.timestamp;
    }

    function getLatestTimestamp()
        external
        view
        returns(uint256)
    {
        return block.timestamp;
    }
}