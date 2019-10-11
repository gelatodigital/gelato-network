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

    event LogActivation(uint256 executionClaimId,
                        address indexed user,
                        address indexed trigger,
                        address indexed action
    );

    function _activateTA(address _trigger,
                         bytes memory _specificTriggerParams,
                         address _action,
                         bytes memory _specificActionParams,
                         uint256 _executionClaimLifespan
    )
        onlyRegisteredTriggers(_trigger)
        onlyRegisteredActions(_action, _executionClaimLifespan)
        internal
    {
        // _________________Minting_____________________________________________
        // Trigger-Action Payloads
        bytes memory triggerPayload
            = abi.encodeWithSelector(_getTriggerSelector(_trigger),
                                     _specificTriggerParams
        );
        // Standard action conditions check before minting
        require(_actionConditionsFulfilled(_action, msg.sender, _specificActionParams),
            "GTAIStandardOwnable.activateTA._actionConditionsFulfilled: failed"
        );
        require(_mintExecutionClaim(msg.sender,  // user
                                    _trigger,
                                    triggerPayload,
                                    _action,
                                    _specificActionParams,
                                    _executionClaimLifespan),
            "GTAIStandardOwnable.activateTA._mintExecutionClaim: failed"
        );
        emit LogActivation(_getCurrentExecutionClaimId(),
                           msg.sender,
                           _trigger,
                           _action
        );
        // =========================
    }
}