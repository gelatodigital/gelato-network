pragma solidity ^0.5.10;

import '../0_gelato_interfaces/2_GTAI_interfaces/IGTAIChained.sol';
import '../1_gelato_standards/3_GTAI_standards/GTAIChainedStandardOwnable.sol';

contract GTAIAggregator is IGTAIChained,
                           GTAIChainedStandardOwnable
{

    constructor(address payable _gelatoCore,
                uint256 _gtaiGasPrice
    )
        GTAIStandardOwnable(_gelatoCore, _gtaiGasPrice)
        public
    {}


    // _____ API FOR TRIGGER-ACTION PAIR ExecutionClaim Minting ________________________
    function activateTA(address _trigger,
                        bytes calldata _specificTriggerParams,
                        address _action,
                        bytes calldata _specificActionParams,
                        uint256 _executionClaimLifespan
    )
        external
        payable
        returns(bool)
    {
        /// @dev Non-standardised charging of the msg.sender/user
        {
            uint256 prepaidExecutionFee = _getExecutionClaimPrice(_action);
            require(msg.value == prepaidExecutionFee,
                "GTAIAggregator.activateTA: prepaidExecutionFee failed"
            );
        }
        // ==
        _activateTA(_trigger,
                    _specificTriggerParams,
                    _action,
                    _specificActionParams,
                    _executionClaimLifespan
        );
        return true;
    }
    // ===============

    //_____ API FOR TRIGGER-ACTION PAIR CHAINED ExecutionClaim Minting __________________
    /// @dev msg.sender must be a registered action!
    function activateChainedTA(address _executionClaimOwner,
                               address _chainedTrigger,
                               bytes calldata _chainedTriggerPayload,
                               address _chainedAction,
                               bytes calldata _chainedActionPayload,
                               uint256 _chainedExecutionClaimLifespan
    )
        external
        returns(bool)
    {
        _activateChainedTA(_executionClaimOwner,
                           _chainedTrigger,
                           _chainedTriggerPayload,
                           _chainedAction,
                           _chainedActionPayload,
                           _chainedExecutionClaimLifespan
        );
        return true;
    }
    // ================
}
