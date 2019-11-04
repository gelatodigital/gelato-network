pragma solidity ^0.5.10;

interface IGelatoAction {
    function getActionSelector() external view returns(bytes4);
    function getActionGasStipend() external view returns(uint256);
}