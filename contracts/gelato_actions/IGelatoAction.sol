pragma solidity ^0.6.4;

/// @title IGelatoAction - solidity interface of GelatoActionsStandard
/// @notice all the APIs and events of GelatoActionsStandard
/// @dev all the APIs are implemented inside GelatoActionsStandard
interface IGelatoAction {
    event LogOneWay(
        address origin,
        address sendToken,
        uint256 sendAmount,
        address destination
    );

    event LogTwoWay(
        address origin,
        address sendToken,
        uint256 sendAmount,
        address destination,
        address receiveToken,
        uint256 receiveAmount,
        address receiver
    );

    /// @notice The selector for an action contract's single action function
    /// @dev Inheriting action contracts must override this properly
    /// @return The function selector for whatever the action's implementation fn is.
    function actionSelector() external pure returns (bytes4);
    /**
     * @notice Returns whether the action-specific conditions are fulfilled
     * @dev if actions have specific conditions they should override and extend this fn
     * @param _actionPayload: the execPayload (with actionSelector)
     * @return actionCondition
     */
    function ok(bytes calldata _actionPayload) external view returns (string memory);
}
