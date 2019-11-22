pragma solidity ^0.5.10;

import "./GelatoActionsStandard.sol";

interface IGelatoUpgradeableAction {
    function getActionOperation() external view returns(GelatoActionsStandard.ActionOperation);
    function getActionSelector() external view returns(bytes4);
    function getActionGasStipend() external view returns(uint256);
    function actionConditionsFulfilled(address _user,
                                       bytes calldata _specificActionParams
    ) external view returns(bool);
    event LogAction(address indexed user);
    function getActionProxyAdmin() external view returns(address);
    function getActionImplementation(address payable _actionProxy) external view returns(address);
}