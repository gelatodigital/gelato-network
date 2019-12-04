pragma solidity ^0.5.13;

import "./IGelatoTrigger.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";

/// @title GelatoTriggersStandard
/// @dev find all the NatSpecs inside IGelatoTrigger
contract GelatoTriggersStandard is IGelatoTrigger, Ownable {
    constructor() internal {}

    bytes4 internal triggerSelector;
    uint256 internal triggerGas;

    function setTriggerGas(uint256 _gas) external onlyOwner {triggerGas = _gas;}

    function getTriggerSelector() external view returns(bytes4) {return triggerSelector;}
    function getTriggerGas() external view returns(uint256) {return triggerGas;}
}