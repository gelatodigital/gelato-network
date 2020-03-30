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

    function action(bytes calldata _actionPayload) external payable;
    function actionStandardSelector() external pure returns(bytes4);

    /**
     * @notice Returns whether the action-specific conditions are fulfilled
     * @dev if actions have specific conditions they should override and extend this fn
     * @param _actionPayload: the actionPayload (with actionSelector)
     * @return actionCondition
     */
    function ok(bytes calldata _actionPayload) external view returns (string memory);
}
