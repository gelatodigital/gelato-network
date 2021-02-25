// SPDX-License-Identifier: MIT
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import {GelatoConditionsStandard} from "../../gelato_conditions/GelatoConditionsStandard.sol";

contract MockConditionDummyRevert is GelatoConditionsStandard {
    // STANDARD interface
    function ok(uint256, bytes calldata _revertCheckData, uint256)
        external
        view
        virtual
        override
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