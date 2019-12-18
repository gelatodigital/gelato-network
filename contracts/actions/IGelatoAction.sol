pragma solidity 0.6.0;

import "../gelato_core/interfaces/IGelatoUserProxyManager.sol";

/// @title IGelatoAction - solidity interface of GelatoActionsStandard
/// @notice all the APIs and events of GelatoActionsStandard
/// @dev all the APIs are implemented inside GelatoActionsStandard
interface IGelatoAction {
    event LogAction(address indexed user);

    function getGelatoCore() external pure returns(address);
    function getActionSelector() external pure returns(bytes4);
    function getActionConditionsOkGas() external pure returns(uint256);
    function getActionGas() external pure returns(uint256);
    function getActionTotalGas() external pure returns(uint256);

    /**
     * @notice Returns whether the action-specific conditions are fulfilled
     * @dev if actions have specific conditions they should override and extend this fn
     * @param _actionPayloadWithSelector: the actionPayload (with actionSelector)
     * @return boolean true if specific action conditions are fulfilled, else false.
     */
    function actionConditionsOk(bytes calldata _actionPayloadWithSelector)
        external
        view
        returns(bool);

    function getProxyOfUser(address payable _user)
        external
        view
        returns(IGelatoUserProxy);
}