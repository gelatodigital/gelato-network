pragma solidity ^0.5.10;

contract GelatoTriggerRegistry {
    // trigger => functionSelector
    mapping(address => mapping(bytes4 => bool)) public triggers;

    modifier onlyRegisteredTriggers(address _trigger,
                                    bytes4 _triggerSelector)
    {
        require(triggers[_trigger][_triggerSelector],
            "GelatoTriggerRegistry.onlyRegisteredTriggers: failed"
        );
        _;
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
    // ____________ Register Trigger END ____________

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
    // ____________ Deregister Trigger ____________
}