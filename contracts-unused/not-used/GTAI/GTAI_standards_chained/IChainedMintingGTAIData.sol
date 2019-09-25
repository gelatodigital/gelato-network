pragma solidity ^0.5.10;

interface IChainedMintingGTAIData {
    function chainedTAData(address _chainedMinterAction)
        external
        returns(address,
                bytes memory,
                address,
                bytes memory,
                uint256
    ); // end
}