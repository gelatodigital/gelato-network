// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;

import { GelatoActionsStandard } from "../../../gelato_actions/GelatoActionsStandard.sol";

contract MockOutFlowUintAction is GelatoActionsStandard {
    event LogNum(uint256 indexed num);

    // passValue bool?
    function action(uint256 _num)
        public
        payable
        virtual
        returns (uint256 num)
    {
        num = _num - 1;
        emit LogNum(num);
    }

    // Will be automatically called by gelato => do not use for encoding
    function gelatoInternal(
        bytes calldata _actionData,
        bytes calldata _taskState
    )
        external
        virtual
        override
        returns(ReturnType, bytes memory)
    {
        uint256 num;

        // 1. Check if taskState exists
        if (_taskState.length != 0) {
            (ReturnType returnType, bytes memory _numBytes) = abi.decode(_taskState, (ReturnType, bytes));
            if (returnType == ReturnType.UINT) {
                (num) = abi.decode(_numBytes, (uint256));
            }
        }

        // 2. Decode Payload, if no taskState was present
        if (num == 0) (num) = abi.decode(_actionData[4:], (uint256));

        // 3. Call action
        num = action(num);

        return(ReturnType.UINT, abi.encodePacked(num));
    }

    function termsOk(uint256, address, bytes calldata _data, DataFlow, uint256)
        public
        view
        override
        virtual
        returns(string memory)
    {
        uint256 num = abi.decode(_data[4:], (uint256));
        return OK;
    }
}
