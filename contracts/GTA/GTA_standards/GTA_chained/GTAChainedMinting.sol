pragma solidity ^0.5.10;

import '../../../GTAI/GTAI_standards/GTAI_chained/IChainedMintingGTAI.sol';

contract GTAChainedMinting {

    IChainedMintingGTAI public chainedMintingGTAI;
    struct ChainedTAData {
        address trigger;
        bytes4 triggerSelector;
        address action;
        bytes4 actionSelector;
    }
    ChainedTAData public chainedTAData;


    constructor(address _chainedMintingGTAI
                address _chainedTrigger,
                bytes4 _chainedTriggerSelector,
                address _chainedAction,
                bytes4 _chainedActionSelector
    )
        internal
    {
        chainedMintingGTAI = IChainedMintingGTAI(_chainedMintingGTAI);
        chainedTAData = ChainedTAData(_chainedTrigger,
                                      _chainedTriggerSelector,
                                      _chainedAction,
                                      _chainedActionSelector
        );
    }

    function _mintExecutionClaim(address _executionClaimOwner,
                                 bytes memory _chainedTriggerPayload,
                                 bytes memory _chainedActionPayload
    )
        internal
    {
        require(chainedMintingGTAI.mintChainedExecutionClaim(_executionClaimOwner,
                                                             ChainedTAData.trigger,
                                                             ChainedTAData.triggerSelector,
                                                             _chainedTriggerPayload,
                                                             ChainedTAData.action,
                                                             ChainedTAData.actionSelector,
                                                             _chainedActionPayload)
            "GTAChainedMinting._mintExecutionClaim: failed"
        );
    }
}