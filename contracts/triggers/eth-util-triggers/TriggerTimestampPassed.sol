pragma solidity ^0.5.10;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "../GelatoTriggersStandard.sol";

contract TriggerTimestampPassed is Initializable, GelatoTriggersStandard {
    function initialize()
        external
        initializer
    {
        triggerSelector = this.fired.selector;
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