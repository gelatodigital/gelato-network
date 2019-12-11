pragma solidity ^0.5.14;

/// @title IGelatoTrigger - solidity interface of GelatoTriggersStandard
/// @notice all the APIs of GelatoTriggersStandard
/// @dev all the APIs are implemented inside GelatoTriggersStandard
interface IGelatoTrigger {
    function correctTriggerSelector() external pure returns(bool);
    function getTriggerSelector() external pure returns(bytes4);
    function getTriggerGas() external pure returns(uint256);
}