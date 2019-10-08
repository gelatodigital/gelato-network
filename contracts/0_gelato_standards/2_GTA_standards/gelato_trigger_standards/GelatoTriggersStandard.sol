pragma solidity ^0.5.10;

import '../../../0_gelato_standards/2_GTA_standards/GTA.sol';

contract GelatoTriggersStandard is GTA {
    bytes4 public triggerSelector;

    constructor(address payable _gelatoCore,
                string memory _triggerSignature
    )
        GTA(_gelatoCore)
        internal
    {
        triggerSelector = bytes4(keccak256(bytes(_triggerSignature)));
    }
}