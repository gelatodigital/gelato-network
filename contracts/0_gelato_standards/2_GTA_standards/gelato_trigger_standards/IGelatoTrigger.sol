pragma solidity ^0.5.10;

interface IGelatoTrigger {
    function gelatoCore() external view returns(address);
    function triggerSelector() external view returns(bytes4);
}