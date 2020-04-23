pragma solidity ^0.6.6;

import { GelatoActionsStandard } from "../../../gelato_actions/GelatoActionsStandard.sol";

contract MockActionDummyRevert is GelatoActionsStandard {
    function action(bytes calldata _data) external payable override virtual {
        action(abi.decode(_data, (bool)));
    }

    function action(bool) public payable virtual {
        revert("MockActionDummyRevert.action: test revert");
    }

    function termsOk(bytes calldata data) external view override virtual returns(string memory) {
        bool isOk = abi.decode(data, (bool));
        return termsOk(isOk);
    }

    function termsOk(bool _isOk) public pure virtual returns(string memory) {
        if (_isOk) return OK;
        revert("MockActionDummyOutOfGas.termsOk");
    }
}
