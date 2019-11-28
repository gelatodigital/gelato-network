pragma solidity ^0.5.10;

import "../gelato_core/interfaces/IGelatoCore.sol";
import "./GelatoActionsStandard.sol";

interface IGelatoAction {
    event LogAction(address indexed user);

    function getGelatoCore() external view returns(IGelatoCore);

    function getActionOperation()
        external
        view
        returns(GelatoActionsStandard.ActionOperation);

    function getActionSelector() external view returns(bytes4);

    function getActionGasStipend() external view returns(uint256);

    /**
     * @notice Returns whether the action-specific conditions are fulfilled
     * @dev if actions have specific conditions they should override and extend this fn
     * param bytes: the actionPayload (with actionSelector)
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