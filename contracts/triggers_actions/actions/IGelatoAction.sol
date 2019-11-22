pragma solidity ^0.5.10;

import './GelatoActionsStandard.sol';

interface IGelatoAction {
    function getActionOperation() external view returns(GelatoActionsStandard.ActionOperation);
    function getActionSelector() external view returns(bytes4);
    function getActionGasStipend() external view returns(uint256);
    function actionConditionsFulfilled(bytes calldata _actionPayloadWithSelector
    ) external view returns(bool);
    event LogAction(address indexed user);
}