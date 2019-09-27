pragma solidity ^0.5.10;

import '../../../GTA/gelato_triggers/gelato_trigger_standards/IGelatoTrigger.sol';

contract GelatoTriggerRegistry {
    // trigger => bool
    mapping(address => bool) public triggers;

    function _getTriggerSelector(address _trigger)
        internal
        view
        returns(bytes4 triggerSelector)
    {
        triggerSelector = IGelatoTrigger(_trigger).triggerSelector();
    }

    // ____________ Register Trigger ____________
    event LogTriggerRegistered(address indexed _registrator,
                               address indexed _triggerAddress
    );
    function _registerTrigger(address _triggerAddress)
        internal
    {
        triggers[_triggerAddress] = true;
        emit LogTriggerRegistered(msg.sender,
                                  _triggerAddress
        );
    }
    // ===========

    // ____________ Deregister Trigger ____________
    event LogTriggerDeregistered(address indexed _registrator,
                                 address indexed _triggerAddress
    );
    function _deregisterTrigger(address _triggerAddress)
        internal
    {
        triggers[_triggerAddress] = false;
        emit LogTriggerDeregistered(msg.sender, _triggerAddress);
    }
    // ===========

    // ____________ Standard Checks _____________________________________
    modifier onlyRegisteredTriggers(address _trigger)
    {
        require(triggers[_trigger],
            "GelatoTriggerRegistry.onlyRegisteredTriggers: failed"
        );
        _;
    }

    modifier triggerHasMatchingGelatoCore(address _trigger,
                                          address payable _gelatoCore)
    {
        require(IGelatoTrigger(_trigger).matchingGelatoCore(_gelatoCore),
            "GelatoTriggerRegistry.triggerHasMatchingGelatoCore: failed"
        );
        _;
    }
    // ===========
}