pragma solidity ^0.5.10;

contract GelatoTriggerRegistry {
    // trigger => functionSelector
    mapping(address => mapping(bytes4 => bool)) public triggers;

    modifier onlyRegisteredTriggers(address _trigger,
                                    bytes4 _functionSelector)
    {
        require(triggers[_trigger][_functionSelector],
            "GelatoTriggerRegistry.onlyRegisteredTriggers: failed"
        );
        _;
    }

    // ____________ Register Trigger ____________
    event LogTriggerRegistered(address indexed _registrator,
                               address indexed _triggerAddress,
                               bytes4 indexed _functionSelector
    );
    function _registerTrigger(address _triggerAddress,
                              bytes4 _functionSelector
    )
        internal
    {
        triggers[_triggerAddress][_functionSelector] = true;
        emit LogTriggerRegistered(msg.sender,
                                  _triggerAddress,
                                  _functionSelector
        );
    }
    // ____________ Register Trigger END ____________

    // ____________ Deregister Trigger ____________
    event LogTriggerDeregistered(address indexed _registrator,
                                 address indexed _triggerAddress,
                                 bytes4 indexed _functionSelector
    );
    function _deregisterTrigger(address _triggerAddress,
                                bytes4  _functionSelector
    )
        internal
    {
        triggers[_triggerAddress][_functionSelector] = false;
        emit LogTriggerDeregistered(msg.sender,
                                    _triggerAddress,
                                    _functionSelector
        );
    }
    // ____________ Deregister Trigger ____________
}