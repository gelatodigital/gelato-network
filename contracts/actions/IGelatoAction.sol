pragma solidity 0.6.0;

/// @title IGelatoAction - solidity interface of GelatoActionsStandard
/// @notice all the APIs and events of GelatoActionsStandard
/// @dev all the APIs are implemented inside GelatoActionsStandard
interface IGelatoAction {

    function actionSelector() external pure returns(bytes4);
    function actionConditionsOkGas() external pure returns(uint256);
    function actionGas() external pure returns(uint256);
    function actionTotalGas() external pure returns(uint256);

    /**
     * @notice Returns whether the action-specific conditions are fulfilled
     * @dev if actions have specific conditions they should override and extend this fn
     * @param _actionPayloadWithSelector: the actionPayload (with actionSelector)
     * @return true if specific action conditions are fulfilled, else false.
     */
    function actionConditionsOk(bytes calldata _actionPayloadWithSelector)
        external
        view
        returns(bool);
}