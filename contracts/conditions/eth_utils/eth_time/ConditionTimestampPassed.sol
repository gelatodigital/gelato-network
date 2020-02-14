pragma solidity ^0.6.2;

import "../../IGelatoCondition.sol";

contract ConditionTimestampPassed is IGelatoCondition {

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

    // conditionSelector public state variable np due to this.actionSelector constant issue
    function conditionSelector() external pure override returns(bytes4) {
        return this.reached.selector;
    }
    uint256 public constant override conditionGas = 30000;

    function reached(uint256 _timestamp)
        external
        view
        returns(bool, uint8)  // executable?, reason
    {
        if (_timestamp <= block.timestamp) return (true, uint8(Reason.OkTimestampPassed));
        else return(false, uint8(Reason.NotOkTimestampDidNotPass));
    }

    function getConditionValue(uint256) external view returns(uint256) {
        return block.timestamp;
    }
}