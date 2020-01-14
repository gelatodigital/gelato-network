pragma solidity ^0.6.0;

import "../../IGelatoTrigger.sol";

contract TriggerTimestampPassed is IGelatoTrigger {

    enum Reason {
        // StandardReason Fields
        Ok,  // 0: Standard Field for Fulfilled Conditions and No Errors
        NotOk,  // 1: Standard Field for Unfulfilled Conditions or Caught/Handled Errors
        UnhandledError,  // 2: Standard Field for Uncaught/Unhandled Errors
        // Ok: Conditions fulfilled
        OkTimestampPassed,
        // NotOk: Unfulfilled Conditions
        NotOkTimestampDidNotPass
    }

    // triggerSelector public state variable np due to this.actionSelector constant issue
    function triggerSelector() external pure override returns(bytes4) {
        return this.fired.selector;
    }
    uint256 public constant override triggerGas = 30000;

    function fired(uint256 _timestamp)
        external
        view
        returns(bool, uint8)  // executable?, reason
    {
        if (_timestamp <= block.timestamp) return (true, uint8(Reason.OkTimestampPassed));
        else return(false, uint8(Reason.NotOkTimestampDidNotPass));
    }

    function getTriggerValue(uint256) external view returns(uint256) {
        return block.timestamp;
    }
}