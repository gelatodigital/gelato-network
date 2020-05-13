pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { IGelatoCore, Task } from "../../../gelato_core/interfaces/IGelatoCore.sol";

contract SubmitTaskScript {

    IGelatoCore public immutable gelatoCore;

    constructor(address _gelatoCore) public {
        gelatoCore = IGelatoCore(_gelatoCore);
    }

    /// @dev will be delegate called by ds_proxy
    function submitTask(Task memory _task, uint256 _expiryDate)
        public
    {
        gelatoCore.submitTask(_task, _expiryDate);
    }

    /// @dev will be delegate called by ds_proxy
    function submitTaskCycle(Task[] memory _tasks, uint256 _cycles, uint256 _expiryDate)
        public
    {
        gelatoCore.submitTaskCycle(_tasks, _cycles, _expiryDate);
    }

    /// @dev will be delegate called by ds_proxy
    function submitTaskChain(Task[] memory _tasks, uint256 _sumOfRequestedTaskSubmits, uint256 _expiryDate)
        public
    {
        gelatoCore.submitTaskCycle(_tasks, _sumOfRequestedTaskSubmits, _expiryDate);
    }
}