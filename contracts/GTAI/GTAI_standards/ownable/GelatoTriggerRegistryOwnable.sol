pragma solidity ^0.5.10;

import '../GelatoTriggerRegistry';
import '@openzeppelin/contracts/ownership/Ownable.sol';

contract GelatoTriggerRegistryOwnable is Ownable {

    function _registerTrigger(address _triggerAddress,
                              bytes4 _functionSelector
    )
        onlyOwner
        public
        returns(bool)
    {
        super._registerTrigger(address _triggerAddress,
                               bytes4 _functionSelector
        )
        return true;
    }

    function _deregisterTrigger(address _triggerAddress,
                                bytes4  _functionSelector
    )
        onlyOwner
        public
        returns(bool)
    {
        super._deregisterTrigger(address _triggerAddress,
                                 bytes4 _functionSelector
        )
        return true;
    }
}