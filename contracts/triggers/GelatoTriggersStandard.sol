pragma solidity ^0.5.10;

import "./IGelatoTrigger.sol";

contract GelatoTriggersStandard is IGelatoTrigger {
    /// @dev non-deploy base contract
    constructor() internal {}
    bytes4 internal triggerSelector;
    function getTriggerSelector() external view returns(bytes4) {return triggerSelector;}
}