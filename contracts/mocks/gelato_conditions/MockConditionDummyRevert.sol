// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import { GelatoConditionsStandard } from "../../gelato_conditions/GelatoConditionsStandard.sol";

contract MockConditionDummyRevert is GelatoConditionsStandard {
    // STANDARD interface
    function ok(uint256, bytes calldata _revertCheckData)
        external
        view
        override
        virtual
        returns(string memory)
    {
        bool returnOk = abi.decode(_revertCheckData, (bool));
        return revertCheck(returnOk);
    }

    function revertCheck(bool _returnOk) public pure virtual returns(string memory) {
        if (_returnOk) return OK;
        revert("MockConditionDummyRevert.ok: test revert");
    }
}