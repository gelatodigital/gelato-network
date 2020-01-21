pragma solidity ^0.6.0;

/// @title IGelatoAction - solidity interface of GelatoActionsStandard
/// @notice all the APIs and events of GelatoActionsStandard
/// @dev all the APIs are implemented inside GelatoActionsStandard
interface IGelatoAction {
    function actionSelector() external pure returns(bytes4);
    function actionGas() external pure returns(uint256);

    /* CAUTION: all actions must have their action() function according to the following standard format:
        -  Param1: address _user,
        -  Param2: address _userProxy
        - Param3: source token Address (also ETH) of token to be transferred/moved/sold ...
        - Param4: source token Amount
        - Param5: destination address
    => function action(address _user, address _userProxy, ....) external returns (GelatoCoreEnums.ExecutionResults, Reason):
    action function not defined here because non-overridable, due to different arguments passed across different actions
    */

    /* CAUTION All Actions must reserve the firstfield of their
       `enum ActionConditions` as such:
        0: Ok  // 0: standard field for Fulfilled Conditions
    */
    enum ActionConditionPrototype { Ok }

    /**
     * @notice Returns whether the action-specific conditions are fulfilled
     * @dev if actions have specific conditions they should override and extend this fn
     * @param _actionPayloadWithSelector: the actionPayload (with actionSelector)
     * @return true if specific action conditions are fulfilled, else false.
     * @return ActionConditionPrototype or extended and converted to uint8
     */
    function actionConditionsCheck(bytes calldata _actionPayloadWithSelector)
        external
        view
        returns(bool, uint8);
}