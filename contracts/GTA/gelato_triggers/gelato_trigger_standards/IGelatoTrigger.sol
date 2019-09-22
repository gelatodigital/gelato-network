pragma solidity ^0.5.10;

interface IGelatoTrigger {
    function gelatoCore() external view returns(address);
    function matchingGelatoCore(address _gelatoCore) external view returns(bool);
    function triggerSelector() external view returns(bytes4);
    function matchingTriggerSelector(bytes4 _triggerSelector) external view returns(bool);
}