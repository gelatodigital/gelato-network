pragma solidity ^0.6.0;

/// @title IGelatoTrigger - solidity interface of GelatoTriggersStandard
/// @notice all the APIs of GelatoTriggersStandard
/// @dev all the APIs are implemented inside GelatoTriggersStandard
interface IGelatoTrigger {
    /* CAUTION All Triggers must reserve the first 3 fields of their `enum Reason` as such:
        0: Ok,  // 0: standard field for Fulfilled Conditions and No Errors
        1: NotOk,  // 1: standard field for Unfulfilled Conditions or Handled Errors
        2: UnhandledError  // 2: standard field for Unhandled or Uncaught Errors
    */

    /* CAUTION: the following functions are part of the standard IGelatoTrigger interface but cannot be overriden
        - "function fired(args) external view": non-standardisable due to different arguments passed across different triggers
        - "function getTriggerValue(same args as fired function) external view/pure": always takes same args as fired()
    */

    function triggerSelector() external pure returns(bytes4);
    function triggerGas() external pure returns(uint256);
}