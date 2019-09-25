pragma solidity ^0.5.10;

import '../GelatoTriggerRegistry.sol';
import '@openzeppelin/contracts/ownership/Ownable.sol';

contract GelatoTriggerRegistryOwnable is GelatoTriggerRegistry,
                                         Ownable
{

    function registerTrigger(address _triggerAddress,
                             bytes4 _functionSelector
    )
        onlyOwner
        public
        returns(bool)
    {
        _registerTrigger(_triggerAddress, _functionSelector);
        return true;
    }

    function deregisterTrigger(address _triggerAddress,
                               bytes4  _functionSelector
    )
        onlyOwner
        public
        returns(bool)
    {
        _deregisterTrigger(_triggerAddress, _functionSelector);
        return true;
    }
}