pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { IGelatoCore, Task } from "../../../gelato_core/interfaces/IGelatoCore.sol";

contract SubmitTaskScript {

    IGelatoCore public immutable gelatoCore;

    constructor(address _gelatoCore) public {
        gelatoCore = IGelatoCore(_gelatoCore);
    }

    /// @dev will be delegate called by ds_proxy
    function submitTask(Task memory _task) public {
        gelatoCore.submitTask(_task);
    }
}