pragma solidity ^0.5.13;

/// @title IGelatoTrigger - solidity interface of GelatoTriggersStandard
/// @notice all the APIs of GelatoTriggersStandard
/// @dev all the APIs are implemented inside GelatoTriggersStandard
interface IGelatoTrigger {
    function setTriggerGas(uint256 _gas) external;
    function getTriggerSelector() external view returns(bytes4);
    function getTriggerGas() external view returns(uint256);
}