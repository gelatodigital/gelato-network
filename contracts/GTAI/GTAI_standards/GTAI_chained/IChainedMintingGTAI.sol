pragma solidity ^0.5.10;

interface IChainedMintingGTAI {

    function mintChainedExecutionClaim(address _executionClaimOwner,
                                       address _triggerAddress,
                                       bytes calldata _triggerPayload,
                                       address _actionAddress,
                                       bytes calldata _actionPayload,
                                       uint256 _actionGasStipend
    )
        external
        returns(bool)
    ; // end

}