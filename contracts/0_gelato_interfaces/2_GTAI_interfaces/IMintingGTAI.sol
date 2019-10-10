pragma solidity ^0.5.10;

interface IMintingGTAI {
    

    function activateChainedTA(address _chainedTrigger,
                               bytes calldata _chainedTriggerPayload,
                               address _chainedAction,
                               bytes calldata _chainedActionPayload,
                               uint256 _chainedExecutionClaimLifespan,
                               address _executionClaimOwner
    )
        external
        returns(bool);

    event LogChainedActivation(uint256 executionClaimId,
                               address indexed executionClaimOwner,
                               address trigger,
                               address indexed action,
                               address indexed minter
    );
}