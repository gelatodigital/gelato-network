pragma solidity ^0.5.10;

import "./IGelatoTrigger.sol";

/// @title GelatoTriggersStandard
/// @dev find all the NatSpecs inside IGelatoTrigger
contract GelatoTriggersStandard is IGelatoTrigger {
    constructor() internal {}
    
    bytes4 internal triggerSelector;
    uint256 internal triggerGas;

    function getTriggerSelector() external view returns(bytes4) {return triggerSelector;}
    function getTriggerGas() external view returns(uint256) {return triggerGas;}
}