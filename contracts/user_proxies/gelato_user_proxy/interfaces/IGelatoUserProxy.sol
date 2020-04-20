pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { Action, Task } from "../../../gelato_core/interfaces/IGelatoCore.sol";

interface IGelatoUserProxy {
    function mintExecClaim(Task calldata _task) external;
    function multiMintExecClaims(Task[] calldata _tasks) external;

    function execAction(Action calldata _action) external;
    function multiExecActions(Action[] calldata _actions) external;

    // Does not work due to `immutable override` InternalCompilerError: Assembly exception for bytecode
    // function user() external pure returns(address);
    // function gelatoCore() external pure returns(address);
}
