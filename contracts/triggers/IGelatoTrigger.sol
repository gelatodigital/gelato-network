pragma solidity ^0.6.0;

/// @title IGelatoTrigger - solidity interface of GelatoTriggersStandard
/// @notice all the APIs of GelatoTriggersStandard
/// @dev all the APIs are implemented inside GelatoTriggersStandard
interface IGelatoTrigger {
    /*
    enum StandardReason {
        Ok,  // 0: standard field for Fulfilled Conditions and No Errors
        NotOk,  // 1: standard field for Unfulfilled Conditions or Handled Errors
        UnhandledError  // 2: standard field for Unhandled or Uncaught Errors
    }
    */

    function triggerSelector() external pure returns(bytes4);
    function triggerGas() external pure returns(uint256);
    function getTriggerValue() external view returns(uint256);
}