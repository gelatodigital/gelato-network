pragma solidity ^0.5.10;

interface IChainedMintingGTAIDataOwnable {
    function chainedTAData(address _chainedMinterAction)
        external
        returns(address,
                bytes memory,
                address,
                bytes memory,
                uint256
    ); // end

    function registerChainedTAData(address _chainedMinterAction,
                                   address _triggerAddress,
                                   bytes calldata _triggerPayload,
                                   address _actionAddress,
                                   bytes calldata _actionPayload,
                                   uint256 _actionGasStipend
    )
        external
        returns(bool)
    ; // end


    function deregisterChainedTAData(address _chainedMinterAction)
        external
        returns(bool)
    ;  // end
}