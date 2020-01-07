pragma solidity ^0.6.0;

/// @title IGelatoTrigger - solidity interface of GelatoTriggersStandard
/// @notice all the APIs of GelatoTriggersStandard
/// @dev all the APIs are implemented inside GelatoTriggersStandard
interface IGelatoTrigger {
    enum TriggerStandardErrorCodes {
        NoError,  // 0 is standard reserved field for NoError
        CaughtError,  // 1 is standard reserved field for CaughtError
        UncaughtError  // 2 is standard reserved field for UncaughtError
    }

    function triggerSelector() external pure returns(bytes4);
    function triggerGas() external pure returns(uint256);
    function getTriggerValue() external view returns(uint256);
}