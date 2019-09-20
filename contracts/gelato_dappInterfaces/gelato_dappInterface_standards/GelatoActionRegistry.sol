pragma solidity ^0.5.10;

contract ActionRegistry {
    // action => functionSelector
    mapping(address => mapping(bytes4 => bool)) public actions;

    modifier onlyRegisteredActions(address _action,
                                   bytes4 _functionSelector)
    {
        require(actions[_action][_functionSelector],
            "Actioned "
        );
    }

    // ____________ Register Actions ____________
    event LogActionRegistered(address indexed _registrator,
                              address indexed _actionAddress,
                              bytes4 indexed _functionSelector
    );
    function _registerAction(address _actionAddress,
                             bytes4 _functionSelector
    )
        internal
        returns(bool)
    {
        actions[_actionAddress][_functionSelector] = true;
        emit LogActionRegistered(msg.sender,
                                 _actionAddress,
                                 _functionSelector
        );
        return true;
    }
    // ____________________________________________

    // ____________ Deregister Actions ____________
    event LogActionDeregistered(address indexed _registrator,
                                address indexed _actionAddress,
                                bytes4 indexed _functionSelector
    );
    function _deregisterAction(address _actionAddress,
                               bytes4 _functionSelector
    )
        internal
        returns(bool)
    {
        actions[_actionAddress][_functionSelector] = false;
        emit LogActionDeregistered(msg.sender,
                                   _actionAddress,
                                   _functionSelector
        );
        return true;
    }
    // ____________________________________________
}