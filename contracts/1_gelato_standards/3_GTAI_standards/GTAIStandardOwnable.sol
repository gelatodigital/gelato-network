pragma solidity ^0.5.10;

import './IcedOut/ownable_IcedOut/IcedOutOwnable.sol';
import './GTA_registry/ownable_registry/GelatoTriggerRegistryOwnable.sol';
import './GTA_registry/ownable_registry/GelatoActionRegistryOwnable.sol';

contract GTAIStandardOwnable is IcedOutOwnable,
                                GelatoTriggerRegistryOwnable,
                                GelatoActionRegistryOwnable
{
    constructor(address payable _gelatoCore,
                uint256 _gtaiGasPrice
    )
        IcedOutOwnable(_gelatoCore, _gtaiGasPrice)
        internal
    {}
}