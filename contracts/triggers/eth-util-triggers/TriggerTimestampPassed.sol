pragma solidity ^0.6.0;

import "../IGelatoTrigger.sol";

contract TriggerTimestampPassed is IGelatoTrigger {

    // triggerSelector public state variable np due to this.actionSelector constant issue
    function triggerSelector() external pure override returns(bytes4) {
        return this.fired.selector;
    }
    uint256 public constant override triggerGas = 30000;

    function fired(uint256 _timestamp)
        external
        view
        returns(bool, uint8)
    {
        return (
            _timestamp <= block.timestamp,
            uint8(TriggerStandardErrorCodes.NoError)
        );
    }

    function getTriggerValue() external view override returns(uint256) {
        return block.timestamp;
    }
}