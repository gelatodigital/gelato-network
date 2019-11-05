pragma solidity ^0.5.10;

contract GelatoTriggersStandard
{
    /// @dev non-deploy base contract
    constructor() internal {}

    bytes4 internal triggerSelector;

    function getTriggerSelector()
        external
        view
        returns(bytes4)
    {
        return triggerSelector;
    }
}