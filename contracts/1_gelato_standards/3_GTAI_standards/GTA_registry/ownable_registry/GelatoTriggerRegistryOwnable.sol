pragma solidity ^0.5.10;

import '../GelatoTriggerRegistry.sol';
import '@openzeppelin/contracts/ownership/Ownable.sol';

contract GelatoTriggerRegistryOwnable is GelatoTriggerRegistry,
                                         Ownable
{
    // to make clear that this is not a standalone-deployment contract
    constructor() internal {}
    
    function registerTrigger(address _triggerAddress)
        onlyOwner
        public
        returns(bool)
    {
        _registerTrigger(_triggerAddress);
        return true;
    }

    function deregisterTrigger(address _triggerAddress)
        onlyOwner
        public
        returns(bool)
    {
        _deregisterTrigger(_triggerAddress);
        return true;
    }
}