pragma solidity ^0.5.10;

interface IGelatoTrigger {
    function getTriggerSelector() external view returns(bytes4);
}