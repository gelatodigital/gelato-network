pragma solidity ^0.5.10;

import '../../GTA/GTA_standards/GTA.sol';
import './GelatoTriggerRegistryOwnable.sol';
import './GelatoActionRegistryOwnable.sol';

contract GTARegistryOwnable is GTA,
                               GelatoTriggerRegistryOwnable,
                               GelatoActionRegistryOwnable
{
    constructor(address _gelatoCore)
        GTA(_gelatoCore)
        internal
    {}

     modifier standardGTAIRegistryChecks(address _trigger,
                                        address _action,
                                        bytes4 _triggerSelector,
                                        bytes4 _actionSelector)
     {
          onlyRegisteredTriggers(_trigger, _triggerSelector)
          onlyRegisteredActions(_action, _actionSelector)
          matchingGelatoCore(_trigger);
          matchingGelatoCore(_action);
          matchingTriggerSelector(_trigger, _triggerSelector);
          matchingActionSelector(_action, _actionSelector);
          _;
     }
}