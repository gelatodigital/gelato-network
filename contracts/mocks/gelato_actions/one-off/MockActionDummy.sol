// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;

import { GelatoActionsStandard } from "../../../gelato_actions/GelatoActionsStandard.sol";

contract MockActionDummy is GelatoActionsStandard {
    event LogAction(bool falseOrTrue);

    function action(bool _falseOrTrue) public payable virtual {
        emit LogAction(_falseOrTrue);
    }

    function termsOk(uint256, address, bytes calldata _data, uint256)
        external
        view
        override
        virtual
        returns(string memory)
    {
        bool isOk = abi.decode(_data, (bool));
        return termsOk(isOk);
    }

    function termsOk(bool _isOk) public pure virtual returns(string memory) {
        if (_isOk) return OK;
        return "NotOk";
    }
}
