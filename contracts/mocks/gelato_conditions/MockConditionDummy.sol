// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;
pragma experimental ABIEncoderV2;

import { GelatoConditionsStandard } from "../../gelato_conditions/GelatoConditionsStandard.sol";

contract MockConditionDummy is GelatoConditionsStandard {
    // STANDARD interface
    function ok(uint256, bytes calldata _data)
        external
        view
        override
        virtual
        returns(string memory)
    {
        bool returnOk = abi.decode(_data[4:], (bool));
        return ok(returnOk);
    }

    function ok(bool _returnOk) public pure virtual returns(string memory returnString) {
       _returnOk ? returnString = OK : returnString = "NotOk";
    }
}