pragma solidity ^0.5.10;

// Interface for GelatoChainedMintingActions to their mintingGTAIs
interface IMintingGTAI
{
    function activateChainedTA(address _executionClaimOwner,
                               address _chainedTrigger,
                               bytes calldata _chainedTriggerPayload,
                               address _chainedAction,
                               bytes calldata _chainedActionPayload,
                               uint256 _chainedExecutionClaimLifespan
    )
        external;

    function getActionExecutionClaimLifespanCap(address _action)
        external
        view
        returns(uint256);
}