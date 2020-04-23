pragma solidity ^0.6.6;

import { GelatoActionsStandard } from "../../../gelato_actions/GelatoActionsStandard.sol";

contract MockActionDummy is GelatoActionsStandard {
    function action(bytes calldata _data) external payable override virtual {
    }

    function action(bool falseOrTrue) public payable virtual {
    }

    function termsOk(bytes calldata _data) external view override virtual returns(string memory) {
        bool isOk = abi.decode(_data, (bool));
        return termsOk(isOk);
    }

    function termsOk(bool _isOk) public pure virtual returns(string memory) {
        if (_isOk) return OK;
        revert("MockActionDummy.termsOk");
    }
}
