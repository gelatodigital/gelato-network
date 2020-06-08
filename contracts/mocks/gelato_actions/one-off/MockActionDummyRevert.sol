// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;

import {GelatoActionsStandard} from "../../../gelato_actions/GelatoActionsStandard.sol";
import {DataFlow} from "../../../gelato_core/interfaces/IGelatoCore.sol";

contract MockActionDummyRevert is GelatoActionsStandard {
    function action(bool) public payable virtual {
        revert("MockActionDummyRevert.action: test revert");
    }

    function termsOk(uint256, address, bytes calldata _data, DataFlow, uint256)
        public
        view
        virtual
        override
        returns(string memory)
    {
        bool isOk = abi.decode(_data, (bool));
        if (isOk) return OK;
        revert("MockActionDummyOutOfGas.termsOk");
    }
}
