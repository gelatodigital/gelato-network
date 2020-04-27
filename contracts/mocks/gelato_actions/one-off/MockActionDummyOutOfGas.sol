pragma solidity ^0.6.6;

import { GelatoActionsStandard } from "../../../gelato_actions/GelatoActionsStandard.sol";

contract MockActionDummyOutOfGas is GelatoActionsStandard {

    uint256 public overflowVar;

    function action(bool) public payable virtual {
        assert(false);
    }

    function placeholder() public pure {
        assert(false);
    }

    function termsOk(address, bytes calldata _data)
        external
        view
        override
        virtual
        returns(string memory)
    {
        (bool isOk) = abi.decode(_data, (bool));
        bool _;
        bytes memory __;
        (_, __) = address(this).staticcall(abi.encodePacked(this.placeholder.selector));
        return termsOk(isOk);
    }

    function termsOk(bool _isOk) public pure virtual returns(string memory) {
        if(_isOk) return OK;
        revert("MockActionDummyOutOfGas.termsOk");
    }
}
