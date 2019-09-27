pragma solidity ^0.5.10;

import '../GelatoActionRegistry.sol';
import '@openzeppelin/contracts/ownership/Ownable.sol';

contract GelatoActionRegistryOwnable is GelatoActionRegistry,
                                        Ownable
{

    function registerAction(address _actionAddress)
        onlyOwner
        public
        returns(bool)
    {
        _registerAction(_actionAddress);
        return true;
    }

    function deregisterAction(address _actionAddress)
        onlyOwner
        public
        returns(bool)
    {
        _deregisterAction(_actionAddress);
        return true;
    }
}