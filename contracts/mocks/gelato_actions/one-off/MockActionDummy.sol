// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;

import {GelatoActionsStandard} from "../../../gelato_actions/GelatoActionsStandard.sol";
import {DataFlow} from "../../../gelato_core/interfaces/IGelatoCore.sol";

contract MockActionDummy is GelatoActionsStandard {
    event LogAction(bool falseOrTrue);

    function action(bool _falseOrTrue) public payable virtual {
        emit LogAction(_falseOrTrue);
    }

    function termsOk(uint256, address, bytes calldata _data, DataFlow, uint256)
        external
        view
        override
        virtual
        returns(string memory)
    {
        bool isOk = abi.decode(_data[4:], (bool));
        if (isOk) return OK;
        return "NotOk";
    }
}
