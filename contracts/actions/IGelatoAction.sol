pragma solidity ^0.6.0;

/// @title IGelatoAction - solidity interface of GelatoActionsStandard
/// @notice all the APIs and events of GelatoActionsStandard
/// @dev all the APIs are implemented inside GelatoActionsStandard
interface IGelatoAction {
    //function actionSelector() external pure returns(bytes4);
    function actionGas() external pure returns(uint256);

    /* CAUTION: all actions must have their action() function according to the following standard format:
        -  Param1: address _user,
        -  Param2: address _userProxy
        - Param3: source token Address (also ETH) of token to be transferred/moved/sold ...
        - Param4: source token Amount
        - Param5: destination address
    => function action(address _user, address _userProxy, ....) external;
    action function not defined here because non-overridable, due to different arguments passed across different actions
    */

    /**
     * @notice Returns whether the action-specific conditions are fulfilled
     * @dev if actions have specific conditions they should override and extend this fn
     * @param _actionPayloadWithSelector: the actionPayload (with actionSelector)
     * @return actionCondition
     */
    function actionConditionsCheck(bytes calldata _actionPayloadWithSelector)
        external
        view
        returns(string memory);

    /**
     * @notice Returns the user's balance of the respective source token or ETH
     * @dev if actions have specific token economics they should override and extend this fn
     * @param _actionPayloadWithSelector: the actionPayload (with actionSelector)
     * @return userSrcBalance the user's balance
     */
    function getUsersSourceTokenBalance(bytes calldata _actionPayloadWithSelector)
        external
        view
        returns(uint256 userSrcBalance);
}