pragma solidity ^0.5.10;

import '../GelatoActionRegistry';
import '@openzeppelin/contracts/ownership/Ownable.sol';

contract GelatoActionRegistryOwnable is Ownable {

    function _registerAction(address _actionAddress,
                             bytes4 _functionSelector
    )
        onlyOwner
        public
        returns(bool)
    {
        super._registerAction(address _actionAddress,
                              bytes4 _functionSelector
        );
        return true;
    }

    function _deregisterAction(address _actionAddress,
                               bytes4 _functionSelector
    )
        onlyOwner
        public
        returns(bool)
    {
        super._deregisterAction(address _actionAddress,
                                bytes4 _functionSelector
        );
        return true;
    }
}