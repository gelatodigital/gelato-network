pragma solidity ^0.6.4;

import { GelatoActionsStandard } from "../../../gelato_actions/GelatoActionsStandard.sol";

contract MockActionDummy is GelatoActionsStandard {
    function action(bytes calldata) external payable override virtual {
    }
}