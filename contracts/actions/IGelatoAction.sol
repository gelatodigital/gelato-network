pragma solidity ^0.6.2;

/// @title IGelatoAction - solidity interface of GelatoActionsStandard
/// @notice all the APIs and events of GelatoActionsStandard
/// @dev all the APIs are implemented inside GelatoActionsStandard
interface IGelatoAction {
    function actionSelector() external pure returns(bytes4);
    function getActionGas() external view returns(uint256);

    /* CAUTION: all actions must have their action() function according to the
    following standard format:
        function action(
            address _user,
            address _userProxy,
            address _sendToken,
            uint256 _sendAmount,
            address _destination,
            ...
        )
            external;
    action function not defined here because non-overridable, due to
    different arguments passed across different actions
    */

    /**
     * @notice Returns whether the action-specific conditions are fulfilled
     * @dev if actions have specific conditions they should override and extend this fn
     * @param _actionPayload: the actionPayload (with actionSelector)
     * @return actionCondition
     */
    function actionConditionsCheck(bytes calldata _actionPayload)
        external
        view
        returns(string memory);

    /// All actions must override this with their own implementation
    /*function getUsersSendTokenBalance(
        address _user,
        address _userProxy,
        address _sendToken,
        uint256 _sendAmount,
        address _destination,
        ...
    )
        external
        view
        override
        virtual
        returns(uint256 userSendTokenBalance);
    getUsersSendTokenBalance not defined here because non-overridable, due to
    different arguments passed across different actions
    */
}