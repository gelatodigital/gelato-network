pragma solidity ^0.5.10;

import './GTAIStandardOwnable.sol';

contract GTAIChainedStandardOwnable is GTAIStandardOwnable
{
    constructor(address payable _gelatoCore,
                uint256 _gtaiGasPrice
    )
        GTAIStandardOwnable(_gelatoCore, _gtaiGasPrice)
        internal
    {}

    event LogChainedActivation(uint256 indexed executionClaimId,
                               address indexed chainedTrigger,
                               address indexed chainedAction,
                               address minter
    );

    function _activateChainedTA(address _executionClaimOwner,
                                address _chainedTrigger,
                                bytes memory _chainedTriggerPayload,
                                address _chainedAction,
                                bytes memory _chainedActionPayload,
                                uint256 _chainedExecutionClaimLifespan
    )
        msgSenderIsRegisteredAction()
        onlyRegisteredTriggers(_chainedTrigger)
        onlyRegisteredActions(_chainedAction, _chainedExecutionClaimLifespan)
        actionConditionsFulfilled(_chainedAction,
                                  _executionClaimOwner,
                                  _chainedActionPayload
        )
        internal
    {
        require(_mintExecutionClaim(_executionClaimOwner,
                                    _chainedTrigger,
                                    _chainedTriggerPayload,
                                    _chainedAction,
                                    _chainedActionPayload,
                                    _chainedExecutionClaimLifespan),
            "GTAIChainedStandardOwnable._activateChainedTA._mintExecutionClaim: fail"
        );
        emit LogChainedActivation(_getCurrentExecutionClaimId(),
                                  _chainedTrigger,
                                  _chainedAction,
                                  msg.sender
        );
    }
}