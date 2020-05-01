pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { Action, Task } from "./IGelatoCore.sol";

interface IGelatoProviderModule {

    /// @notice Check if provider agrees to pay for inputted task receipt
    /// @dev Enables arbitrary checks by provider
    /// @param _userProxy userProxy
    /// @param _task Task
    /// @return "OK" if provider agrees
    function isProvided(address _userProxy, Task calldata _task)
        external
        view
        returns(string memory);

    /// @notice Convert action specific payload into proxy specific payload
    /// @dev Encoded multiple actions into a multisend
    /// @param _actions List of actions to execute
    /// @return Encoded payload that will be used for low-level .call on user proxy
    /// @return checkReturndata if true, fwd returndata from userProxy.call to ProviderModule
    function execPayload(Action[] calldata _actions)
        external
        view
        returns(bytes memory, bool checkReturndata);

    function execRevertCheck(bytes calldata _proxyReturndata)
        external
        view
        returns(bool);
}
