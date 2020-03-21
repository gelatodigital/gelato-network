pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

/// @title IGelatoCondition - solidity interface of GelatoConditionsStandard
/// @notice all the APIs of GelatoConditionsStandard
/// @dev all the APIs are implemented inside GelatoConditionsStandard
interface IGelatoCondition {
    function ok(bytes calldata _conditionPayload) external view returns(string memory);
    function currentState(bytes calldata _conditionPayload)
        external
        view
        returns(ConditionValues memory);
}

struct ConditionValues {
    address[] addresses;
    bool[] booleans;
    bytes _bytes;
    bytes32[] words;
    uint256[] uints;
    string strings;
}