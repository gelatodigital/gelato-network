pragma solidity ^0.6.4;

import "../../IGelatoCondition.sol";

contract ConditionTimestampPassed is IGelatoCondition {
    // conditionSelector public state variable np due to this.actionSelector constant issue
    function conditionSelector() external pure override returns(bytes4) {
        return this.reached.selector;
    }

    function reached(uint256 _timestamp)
        external
        view
        returns(bool, string memory)  // executable?, reason
    {
        if (_timestamp <= block.timestamp) return (true, "0");
        else return(false, "NotOkTimestampDidNotPass");
    }

    function getConditionValue(uint256) external view returns(uint256) {
        return block.timestamp;
    }
}