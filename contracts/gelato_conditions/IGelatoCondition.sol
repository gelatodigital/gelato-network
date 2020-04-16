pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

/// @title IGelatoCondition - solidity interface of GelatoConditionsStandard
/// @notice all the APIs of GelatoConditionsStandard
/// @dev all the APIs are implemented inside GelatoConditionsStandard
interface IGelatoCondition {
    function ok(bytes calldata _conditionData) external view returns(string memory);
    function okStandardSelector() external pure returns(bytes4);
}