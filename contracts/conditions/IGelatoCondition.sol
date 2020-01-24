pragma solidity ^0.6.0;

/// @title IGelatoCondition - solidity interface of GelatoConditionsStandard
/// @notice all the APIs of GelatoConditionsStandard
/// @dev all the APIs are implemented inside GelatoConditionsStandard
interface IGelatoCondition {
    /* CAUTION All Conditions must reserve the first 3 fields of their `enum Reason` as such:
        0: Ok,  // 0: standard field for Fulfilled Conditions and No Errors
        1: NotOk,  // 1: standard field for Unfulfilled Conditions or Handled Errors
        2: UnhandledError  // 2: standard field for Unhandled or Uncaught Errors
    */

    /* CAUTION: the following functions are part of the standard IGelatoCondition interface but cannot be overriden
        - "function reached(args) external view": non-standardisable due to different arguments passed across different conditions
        - "function getConditionValue(same args as reached function) external view/pure": always takes same args as reached()
    */

    function conditionSelector() external pure returns(bytes4);
    function conditionGas() external pure returns(uint256);
}