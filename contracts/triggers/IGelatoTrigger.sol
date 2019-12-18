pragma solidity ^0.6.0;

/// @title IGelatoTrigger - solidity interface of GelatoTriggersStandard
/// @notice all the APIs of GelatoTriggersStandard
/// @dev all the APIs are implemented inside GelatoTriggersStandard
interface IGelatoTrigger {
    function triggerSelector() external pure returns(bytes4);
    function triggerGas() external pure returns(uint256);
    function getTriggerValue() external view returns(uint256);
}