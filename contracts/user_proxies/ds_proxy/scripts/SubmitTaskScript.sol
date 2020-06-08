// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;
pragma experimental ABIEncoderV2;

import {IGelatoCore, Provider, Task} from "../../../gelato_core/interfaces/IGelatoCore.sol";

contract SubmitTaskScript {

    IGelatoCore public immutable gelatoCore;

    constructor(address _gelatoCore) public {
        gelatoCore = IGelatoCore(_gelatoCore);
    }

    /// @dev will be delegate called by ds_proxy
    function submitTask(Provider memory _provider, Task memory _task, uint256 _expiryDate)
        public
    {
        gelatoCore.submitTask(_provider, _task, _expiryDate);
    }

    /// @dev will be delegate called by ds_proxy
    function submitTaskCycle(
        Provider memory _provider,
        Task[] memory _tasks,
        uint256 _expiryDate,
        uint256 _cycles
    )
        public
    {
        gelatoCore.submitTaskCycle(_provider, _tasks, _expiryDate, _cycles);
    }

    /// @dev will be delegate called by ds_proxy
    function submitTaskChain(
        Provider memory _provider,
        Task[] memory _tasks,
        uint256 _expiryDate,
        uint256 _sumOfRequestedTaskSubmits
    )
        public
    {
        gelatoCore.submitTaskCycle(_provider, _tasks, _expiryDate, _sumOfRequestedTaskSubmits);
    }
}
