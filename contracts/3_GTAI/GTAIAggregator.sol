pragma solidity ^0.5.10;

import '../0_gelato_standards/3_GTAI_standards/IcedOut/IcedOutOwnable.sol';
import '../0_gelato_standards/3_GTAI_standards/GTA_registry/ownable_registry/GelatoTriggerRegistryOwnable.sol';
import '../0_gelato_standards/3_GTAI_standards/GTA_registry/ownable_registry/GelatoActionRegistryOwnable.sol';
import '../0_gelato_standards/3_GTAI_standards/IGTAIFull.sol';

contract GTAIAggregator is IGTAIFull,
                           IcedOutOwnable,
                           GelatoTriggerRegistryOwnable,
                           GelatoActionRegistryOwnable
{

    constructor(address payable _gelatoCore,
                uint256 _executionClaimLifetime,
                uint256 _gtaiGasPrice,
                uint256 _automaticTopUpAmount
    )
        IcedOutOwnable(_gelatoCore,
                       _executionClaimLifetime,
                       _gtaiGasPrice,
                       _automaticTopUpAmount
        )
        public
    {}


    // _______________ API FOR DAPP TRIGGER ACTION MINTING____________________
    event LogActivation(uint256 executionClaimId,
                        address indexed executionClaimOwner,
                        address indexed trigger,
                        address indexed action
    );

    function activateTA(address _trigger,
                        bytes calldata _specificTriggerParams,
                        address _action,
                        bytes calldata _specificActionParams,
                        uint256 _executionClaimLifespan
    )
        onlyRegisteredTriggers(_trigger)
        onlyRegisteredActions(_action, _executionClaimLifespan)
        external
        payable
        returns(bool)
    {
        /// @dev Calculations for charging the msg.sender/user
        uint256 prepaidExecutionFee = _getExecutionClaimPrice(_action);
        require(msg.value == prepaidExecutionFee,
            "GTAIAggregator.activateTA: prepaidExecutionFee failed"
        );
        // _________________Minting_____________________________________________
        // Trigger-Action Payloads
        bytes memory triggerPayload
            = abi.encodeWithSelector(_getTriggerSelector(_trigger),
                                     _specificTriggerParams
        );
        // Standard action conditions check before minting
        require(_actionConditionsFulfilled(_action, msg.sender, _specificActionParams),
            "GTAIAggregator.activateTA._actionConditionsFulfilled: failed"
        );
        _mintExecutionClaim(msg.sender,  // executionClaimOwner
                            _trigger,
                            triggerPayload,
                            _action,
                            _specificActionParams,
                            _executionClaimLifespan
        );
        emit LogActivation(_getCurrentExecutionClaimId(),
                           msg.sender,
                           _trigger,
                           _action
        );
        return true;
        // =========================
    }

    //___________________ Chained Execution Claim Minting _____________________
    event LogChainedActivation(uint256 executionClaimId,
                               address indexed executionClaimOwner,
                               address trigger,
                               address indexed action,
                               address indexed minter
    );

    function activateChainedTA(address _chainedTrigger,
                               bytes calldata _chainedTriggerPayload,
                               address _chainedAction,
                               bytes calldata _chainedActionPayload,
                               uint256 _chainedExecutionClaimLifespan,
                               address _executionClaimOwner
    )
        msgSenderIsRegisteredAction()
        onlyRegisteredTriggers(_chainedTrigger)
        onlyRegisteredActions(_chainedAction, _chainedExecutionClaimLifespan)
        actionConditionsFulfilled(_chainedAction,
                                  _executionClaimOwner,
                                  _chainedActionPayload
        )
        external
        returns(bool)
    {
        _mintExecutionClaim(_executionClaimOwner,
                            _chainedTrigger,
                            _chainedTriggerPayload,
                            _chainedAction,
                            _chainedActionPayload,
                            _chainedExecutionClaimLifespan
        );
        emit LogChainedActivation(_getCurrentExecutionClaimId(),
                                  _executionClaimOwner,
                                  _chainedTrigger,
                                  _chainedAction,
                                  msg.sender  // minterAction
        );
        return true;
    }
    // ================
}


