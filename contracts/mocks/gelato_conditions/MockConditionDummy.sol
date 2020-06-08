// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import {GelatoConditionsStandard} from "../../gelato_conditions/GelatoConditionsStandard.sol";

contract MockConditionDummy is GelatoConditionsStandard {
    // STANDARD interface
    function ok(uint256, bytes calldata _dummyCheckData)
        external
        view
        virtual
        override
        returns(string memory)
    {
        bool returnOk = abi.decode(_dummyCheckData, (bool));
        return dummyCheck(returnOk);
    }

    function dummyCheck(bool _returnOk) public pure virtual returns(string memory returnString) {
       _returnOk ? returnString = OK : returnString = "NotOk";
    }
}