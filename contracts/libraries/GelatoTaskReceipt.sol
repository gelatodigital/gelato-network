// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;

import {Task, TaskReceipt} from "../gelato_core/interfaces/IGelatoCore.sol";

library GelatoTaskReceipt {
    function task(TaskReceipt memory _TR) internal pure returns(Task memory) {
        return _TR.tasks[_TR.index];
    }

    function nextIndex(TaskReceipt memory _TR) internal pure returns(uint256) {
        return _TR.index == _TR.tasks.length - 1 ? 0 : _TR.index + 1;
    }

    function selfProvider(TaskReceipt memory _TR) internal pure returns(bool) {
        return _TR.provider.addr == _TR.userProxy;
    }
}