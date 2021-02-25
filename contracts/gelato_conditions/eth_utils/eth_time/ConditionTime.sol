// SPDX-License-Identifier: MIT
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import {GelatoConditionsStandard} from "../../GelatoConditionsStandard.sol";

contract ConditionTime is GelatoConditionsStandard {

    /// @dev use this function to encode the data off-chain for the condition data field
    function getConditionData(uint256 _timestamp)
        public
        pure
        virtual
        returns(bytes memory)
    {
        return abi.encode(_timestamp);
    }

    /// @param _conditionData The encoded data from getConditionData()
    function ok(uint256, bytes calldata _conditionData, uint256)
        public
        view
        virtual
        override
        returns(string memory)
    {
        uint256 timestamp = abi.decode(_conditionData, (uint256));
        return timeCheck(timestamp);
    }

    // Specific implementation
    function timeCheck(uint256 _timestamp) public view virtual returns(string memory) {
        if (_timestamp <= block.timestamp) return OK;
        return "NotOkTimestampDidNotPass";
    }
}