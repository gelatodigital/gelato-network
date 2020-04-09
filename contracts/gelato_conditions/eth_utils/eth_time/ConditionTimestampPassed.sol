pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { GelatoConditionsStandard } from "../../GelatoConditionsStandard.sol";

contract ConditionTimestampPassed is GelatoConditionsStandard {

    // STANDARD interface
    function ok(bytes calldata _conditionPayload)
        external
        view
        virtual
        override
        returns(string memory)
    {
        uint256 timestamp = abi.decode(_conditionPayload[4:], (uint256));
        return ok(timestamp);
    }

    // Specific implementation
    function ok(uint256 _timestamp) public view virtual returns(string memory) {
        if (_timestamp <= block.timestamp) return "Ok";
        return "NotOkTimestampDidNotPass";
    }
}