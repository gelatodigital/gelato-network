pragma solidity ^0.6.6;

import { GelatoActionsStandard } from "../../../gelato_actions/GelatoActionsStandard.sol";

contract MockActionDummyOutOfGas is GelatoActionsStandard {

    uint256 public overflowVar;

    function action(bytes calldata) external payable override virtual {
    }

    function action(bool) public payable virtual {
        assert(false);
    }

    function placeholder() public pure {
        assert(false);
    }

    function termsOk(bytes calldata data) external view override virtual returns(string memory) {
        (bool isOk) = abi.decode(data, (bool));
        address(this).staticcall(abi.encodePacked(this.placeholder.selector));
        return termsOk(isOk);
    }

    function termsOk(bool _isOk) public pure virtual returns(string memory)
    {
        if(_isOk) return OK;
        revert("Action TermsOk not ok");
    }
}
