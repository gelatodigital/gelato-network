pragma solidity ^0.5.10;

import '../../../0_gelato_standards/3_GTAI_standards/GTAI_chained/IMintingGTAI.sol';
import '../../../0_gelato_standards/2_GTA_standards/gelato_trigger_standards/IGelatoTrigger.sol';
import '../../../0_gelato_standards/2_GTA_standards/gelato_action_standards/IGelatoAction.sol';

contract GTAChainedMinting {

    IMintingGTAI public mintingGTAI;
    address public chainedTrigger;
    address public chainedAction;


    constructor(address _mintingGTAI,
                address _chainedTrigger,
                address _chainedAction
    )
        internal
    {
        mintingGTAI = IMintingGTAI(_mintingGTAI);
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

    function _activateChainedTAviaMintingGTAI(address _executionClaimOwner,
                                              bytes memory _chainedTriggerPayload,
                                              bytes memory _chainedActionPayload
    )
        internal
        returns(bool)
    {
        require(mintingGTAI.activateChainedTA(_executionClaimOwner,
                                              chainedTrigger,
                                              _chainedTriggerPayload,
                                              chainedAction,
                                              _chainedActionPayload),
            "GTAChainedMinting._activateChainedTAviaMintingGTAI: failed"
        );
        return true;
    }

    event LogGTAChainedMinting(uint256 indexed executionClaimId,
                               address indexed executionClaimOwner
    );
}