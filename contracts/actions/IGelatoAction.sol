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

    function actionConditionsOk(bytes calldata _actionPayloadWithSelector)
        external
        view
        returns(bool);

    function getProxyOfUser(address payable _user)
        external
        view
        returns(IGelatoUserProxy);
}