pragma solidity ^0.5.10;

interface IGelatoAction {
    function gelatoCore() external view returns(address);
    function actionSelector() external view returns(bytes4);
    function actionGasStipend() external view returns(uint256);
    function matchingGelatoCore(address _gelatoCore) external view returns(bool);
}