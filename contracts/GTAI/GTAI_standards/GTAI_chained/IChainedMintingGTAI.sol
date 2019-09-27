pragma solidity ^0.5.10;

interface IChainedMintingGTAI {

    function activateChainedTA(address _executionClaimOwner,
                               address _chainedTrigger,
                               bytes calldata _chainedTriggerPayload,
                               address _chainedAction,
                               bytes calldata _chainedActionPayload
    )
        external
        returns(bool)
    ; // end

}