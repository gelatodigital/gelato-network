pragma solidity ^0.5.10;

interface IChainedMintingGTAI {

    function mintChainedExecutionClaim(address _executionClaimOwner,
                                       address _chainedTrigger,
                                       bytes4 _chainedTriggerSelector,
                                       bytes calldata _chainedTriggerPayload,
                                       address _chainedAction,
                                       bytes4 _chainedActionSelector,
                                       bytes calldata _chainedActionPayload
    )
        external
        returns(bool)
    ; // end

}