pragma solidity ^0.5.10;

import '../GelatoTriggersStandard.sol';

contract TriggerTimestampPassed is GelatoTriggersStandard
{
    function initialize()
        external
        initializer
    {
        GelatoTriggersStandard._initialize("fired(uint256)");
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