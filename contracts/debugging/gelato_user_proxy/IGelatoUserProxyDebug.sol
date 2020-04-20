pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import { Action, Task } from "../../gelato_core/interfaces/IGelatoCore.sol";

interface IGelatoUserProxyDebug {
    function mintExecClaim(Task calldata _task) external;
    function multiMintExecClaims(Task[] calldata _tasks) external;

    function execAction(Action calldata _action) external;
    function multiExecActions(Action[] calldata _actions) external;

    // Does not work due to `immutable override` InternalCompilerError: Assembly exception for bytecode
    function user() external view returns(address);
    function gelatoCore() external view returns(address);
}
