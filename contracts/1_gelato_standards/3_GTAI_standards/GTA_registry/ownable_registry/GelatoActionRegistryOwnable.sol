pragma solidity ^0.5.10;

import '../GelatoActionRegistry.sol';
import '@openzeppelin/contracts/ownership/Ownable.sol';

contract GelatoActionRegistryOwnable is GelatoActionRegistry,
                                        Ownable
{
    // to make clear that this is not a standalone-deployment contract
    constructor() internal {}
    
    function registerAction(address _action,
                            uint256 _executionClaimLifespan
    )
        onlyOwner
        public
        returns(bool)
    {
        _registerAction(_action, _executionClaimLifespan);
        return true;
    }

    function deregisterAction(address _action)
        onlyOwner
        public
        returns(bool)
    {
        _deregisterAction(_action);
        return true;
    }
}