// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;
pragma experimental ABIEncoderV2;

import { GelatoConditionsStandard } from "../../GelatoConditionsStandard.sol";

contract ConditionTimestampPassed is GelatoConditionsStandard {

    // STANDARD interface
    function ok(uint256, bytes calldata _timeCheckData)
        external
        view
        virtual
        override
        returns(string memory)
    {
        uint256 timestamp = abi.decode(_timeCheckData, (uint256));
        return timeCheck(timestamp);
    }

    // Specific implementation
    function timeCheck(uint256 _timestamp) public view virtual returns(string memory) {
        if (_timestamp <= block.timestamp) return OK;
        return "NotOkTimestampDidNotPass";
    }
}