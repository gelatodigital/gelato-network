pragma solidity ^0.5.10;

import '../../../../GTA/GTA_standards/GTA.sol';
import './GelatoTriggerRegistryOwnable.sol';
import './GelatoActionRegistryOwnable.sol';

contract GTARegistryOwnable is GTA,
                               GelatoTriggerRegistryOwnable,
                               GelatoActionRegistryOwnable
{
    constructor(address payable _gelatoCore)
        GTA(_gelatoCore)
        internal
    {}

     function _standardGTARegistryChecks(address _trigger,
                                         address _action,
                                         bytes4 _triggerSelector,
                                         bytes4 _actionSelector,
                                         address payable _gelatoCore
    )
        onlyRegisteredTriggers(_trigger, _triggerSelector)
        onlyRegisteredActions(_action, _actionSelector)
        hasMatchingGelatoCore(_gelatoCore)
        hasMatchingGelatoCore(_gelatoCore)
        matchingTriggerSelector(_trigger, _triggerSelector)
        matchingActionSelector(_action, _actionSelector)
        internal
     {}
}