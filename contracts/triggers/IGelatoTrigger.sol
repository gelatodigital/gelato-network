pragma solidity 0.6.0;

/// @title IGelatoTrigger - solidity interface of GelatoTriggersStandard
/// @notice all the APIs of GelatoTriggersStandard
/// @dev all the APIs are implemented inside GelatoTriggersStandard
interface IGelatoTrigger {
    function getTriggerValue() external view returns(uint256);
    function getTriggerSelector() external pure returns(bytes4);
    function getTriggerGas() external pure returns(uint256);
}