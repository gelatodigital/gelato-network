pragma solidity ^0.6.0;

/// @title IGelatoAction - solidity interface of GelatoActionsStandard
/// @notice all the APIs and events of GelatoActionsStandard
/// @dev all the APIs are implemented inside GelatoActionsStandard
interface IGelatoAction {

    // Same as GelatoCoreEnums.StandardReason
    enum StandardReason {
        Ok,  // 0: standard field for Fulfilled Conditions and No Errors
        NotOk,  // 1: standard field for Unfulfilled Conditions or Handled Errors
        UnhandledError  // 2: standard field for Unhandled or Uncaught Errors
    }

    function actionSelector() external pure returns(bytes4);
    function actionConditionsCheckGas() external pure returns(uint256);
    function actionGas() external pure returns(uint256);
    function actionTotalGas() external pure returns(uint256);

    /**
     * @notice Returns whether the action-specific conditions are fulfilled
     * @dev if actions have specific conditions they should override and extend this fn
     * @param _actionPayloadWithSelector: the actionPayload (with actionSelector)
     * @return true if specific action conditions are fulfilled, else false.
     * @return ActionStandardReason
     */
    function actionConditionsCheck(bytes calldata _actionPayloadWithSelector)
        external
        view
        returns(bool, uint8);
}