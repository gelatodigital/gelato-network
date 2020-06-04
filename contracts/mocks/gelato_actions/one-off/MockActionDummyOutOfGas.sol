// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;

import { GelatoActionsStandard } from "../../../gelato_actions/GelatoActionsStandard.sol";

contract MockActionDummyOutOfGas is GelatoActionsStandard {

    uint256 public overflowVar;

    function action(bool) public payable virtual {
        assert(false);
    }

    // Will be automatically called by gelato => do not use for encoding
    function gelatoInternal(bytes calldata _actionData, bytes calldata)
        external
        virtual
        override
        returns(ReturnType, bytes memory)
    {
        bool isOk = abi.decode(_actionData, (bool));
        action(isOk);
    }

    function placeholder() public pure {
        assert(false);
    }

    function termsOk(uint256, address, bytes calldata _data, uint256)
        external
        view
        override
        virtual
        returns(string memory)
    {
        bool isOk = abi.decode(_data, (bool));
        bool _;
        bytes memory __;
        (_, __) = address(this).staticcall(abi.encodePacked(this.placeholder.selector));
        return termsOk(isOk);
    }

    function termsOk(bool _isOk) public pure virtual returns(string memory) {
        if (_isOk) return OK;
        revert("MockActionDummyOutOfGas.termsOk");
    }
}
