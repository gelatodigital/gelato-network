pragma solidity ^0.5.10;

import '../../../GTA/gelato_triggers/gelato_trigger_standards/IGelatoTrigger.sol';

contract GelatoTriggerRegistry {
    // trigger => functionSelector
    mapping(address => mapping(bytes4 => bool)) public triggers;

    function _getTriggerSelector(address _trigger)
        internal
        view
        returns(bytes4 triggerSelector)
    {
        triggerSelector = IGelatoTrigger(_trigger).triggerSelector();
    }

    // ____________ Register Trigger ____________
    event LogTriggerRegistered(address indexed _registrator,
                               address indexed _triggerAddress,
                               bytes4 indexed _triggerSelector
    );
    function _registerTrigger(address _triggerAddress,
                              bytes4 _triggerSelector
    )
        internal
    {
        triggers[_triggerAddress][_triggerSelector] = true;
        emit LogTriggerRegistered(msg.sender,
                                  _triggerAddress,
                                  _triggerSelector
        );
    }
    // ===========

    // ____________ Deregister Trigger ____________
    event LogTriggerDeregistered(address indexed _registrator,
                                 address indexed _triggerAddress,
                                 bytes4 indexed _triggerSelector
    );
    function _deregisterTrigger(address _triggerAddress,
                                bytes4  _triggerSelector
    )
        internal
    {
        triggers[_triggerAddress][_triggerSelector] = false;
        emit LogTriggerDeregistered(msg.sender,
                                    _triggerAddress,
                                    _triggerSelector
        );
    }
    // ===========

    // ____________ Standard Checks _____________________________________
    modifier onlyRegisteredTriggers(address _trigger,
                                    bytes4 _triggerSelector)
    {
        require(triggers[_trigger][_triggerSelector],
            "GelatoTriggerRegistry.onlyRegisteredTriggers: failed"
        );
        _;
    }

    modifier matchingTriggerSelector(address _trigger,
                                     bytes4 _triggerSelector)
     {
        require(IGelatoTrigger(_trigger).matchingTriggerSelector(_triggerSelector),
            "GelatoTriggerRegistry.matchingTriggerSelector: failed"
        );
        _;
     }
    // ===========
}