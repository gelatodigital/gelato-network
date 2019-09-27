pragma solidity ^0.5.10;

import '../../../GTAI/GTAI_standards/GTAI_chained/IChainedMintingGTAI.sol';
import '../../gelato_triggers/gelato_trigger_standards/IGelatoTrigger.sol';
import '../../gelato_actions/gelato_action_standards/IGelatoAction.sol';

contract GTAChainedMinting {

    IChainedMintingGTAI public chainedMintingGTAI;
    address public chainedTrigger;
    address public chainedAction;


    constructor(address _chainedMintingGTAI,
                address _chainedTrigger,
                address _chainedAction
    )
        internal
    {
        chainedMintingGTAI = IChainedMintingGTAI(_chainedMintingGTAI);
        chainedTrigger = _chainedTrigger;
        chainedAction = _chainedAction;
    }

    function _getChainedTriggerSelector()
        internal
        view
        returns(bytes4 chainedTriggerSelector)
    {
        chainedTriggerSelector = IGelatoTrigger(chainedTrigger).triggerSelector();
    }

    function _getChainedActionSelector()
        internal
        view
        returns(bytes4 chainedActionSelector)
    {
        chainedActionSelector = IGelatoAction(chainedAction).actionSelector();
    }

    function _mintExecutionClaim(address _executionClaimOwner,
                                 bytes memory _chainedTriggerPayload,
                                 bytes memory _chainedActionPayload
    )
        internal
        returns(bool)
    {
        require(chainedMintingGTAI.activateChainedTA(_executionClaimOwner,
                                                     chainedTrigger,
                                                     _chainedTriggerPayload,
                                                     chainedAction,
                                                     _chainedActionPayload),
            "GTAChainedMinting._mintExecutionClaim: failed"
        );
        return true;
    }
}