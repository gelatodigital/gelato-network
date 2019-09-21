pragma solidity ^0.5.10;

interface IGelatoAction {
    function gelatoCore() external returns(address);
    function actionSelector() external returns(bytes4);
    function actionGasStipend() external returns(uint256);
}