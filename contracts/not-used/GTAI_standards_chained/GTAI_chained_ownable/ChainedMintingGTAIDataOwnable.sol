pragma solidity ^0.5.10;

import '../ChainedMintingGTAIData.sol';
import '@openzeppelin/contracts/ownership/Ownable.sol';

contract ChainedMintingGTAIDataOwnable is ChainedMintingGTAIData,
                                          Ownable
{
    function registerChainedTAData(address _chainedMinterAction,
                                   address _triggerAddress,
                                   bytes memory _triggerPayload,
                                   address _actionAddress,
                                   bytes memory _actionPayload,
                                   uint256 _actionGasStipend
    )
        onlyOwner
        public
        returns(bool)
    {
        _registerChainedTAData(_chainedMinterAction,
                               _triggerAddress,
                               _triggerPayload,
                               _actionAddress,
                               _actionPayload,
                               _actionGasStipend
        );
        return true;
    }

    function deregisterChainedTAData(address _chainedMinterAction)
        onlyOwner
        public
        returns(bool)
    {
        _deregisterChainedTAData(_chainedMinterAction);
        return true;
    }

}