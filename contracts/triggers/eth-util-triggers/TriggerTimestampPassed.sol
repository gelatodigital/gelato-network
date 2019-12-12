pragma solidity ^0.5.14;

import "../IGelatoTrigger.sol";

contract TriggerTimestampPassed is IGelatoTrigger {

    bytes4 constant internal triggerSelector = bytes4(keccak256(bytes("fired(uint256)")));
    uint256 constant internal triggerGas = 30000;

    function fired(uint256 _timestamp)
        external
        view
        returns(bool)
    {
        return _timestamp <= block.timestamp;
    }

    // Overriding IGelatoTrigger state readers (mandatory)
    function getTriggerValue() external view returns(uint256) {return block.timestamp;}
    function correctTriggerSelector() external pure returns(bool) {
        return triggerSelector == this.fired.selector;
    }
    function getTriggerSelector() external pure returns(bytes4) {return triggerSelector;}
    function getTriggerGas() external pure returns(uint256) {return triggerGas;}
}