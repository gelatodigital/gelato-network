pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import { IGelatoCondition, PossibleConditionValues } from "../../IGelatoCondition.sol";

contract ConditionTimestampPassed is IGelatoCondition {
    // conditionSelector public state variable np due to this.actionSelector constant issue
    function conditionSelector() external pure override returns(bytes4) {
        return this.ok.selector;
    }

    function ok(bytes calldata _conditionPayload)
        external
        view
        override
        returns(string memory)
    {
        uint256 timestamp = abi.decode(_conditionPayload[4:], (uint256));
        if (timestamp <= block.timestamp) return "ok";
        return "NotOkTimestampDidNotPass";
    }

    function currentState(bytes calldata)
        external
        view
        override
        returns(PossibleConditionValues memory _values)
    {
        _values.uints[0] = block.timestamp;
    }
}