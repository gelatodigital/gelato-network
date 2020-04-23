pragma solidity ^0.6.6;
pragma experimental ABIEncoderV2;

import { Action, TaskReceipt } from "./IGelatoCore.sol";

interface IGelatoProviderModule {

    /// @notice Check if provider agrees to pay for inputted task receipt
    /// @dev Enables arbitrary checks by provider
    /// @param _TR Task Receipt
    /// @return "OK" if provider agrees
    function isProvided(TaskReceipt calldata _TR)
        external
        view
        returns(string memory);

    /// @notice Convert action specific payload into proxy specific payload
    /// @dev Encoded multiple actions into a multisend
    /// @param _actions List of actions to execute
    /// @return Encoded payload that will be used for low-level .call on user proxy
    function execPayload(Action[] calldata _actions) external pure returns(bytes memory);
}
