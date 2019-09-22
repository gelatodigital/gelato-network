pragma solidity ^0.5.10;

contract GelatoActionRegistry {
    // action => functionSelector
    mapping(address => mapping(bytes4 => bool)) public actions;

    modifier onlyRegisteredActions(address _action,
                                   bytes4 _actionSelector)
    {
        require(actions[_action][_actionSelector],
            "GelatoActionRegistry.onlyRegisteredActions: failed"
        );
        _;
    }

    // ____________ Register Actions ____________
    event LogActionRegistered(address indexed _registrator,
                              address indexed _actionAddress,
                              bytes4 indexed _actionSelector
    );
    function _registerAction(address _actionAddress,
                             bytes4 _actionSelector
    )
        internal
    {
        actions[_actionAddress][_actionSelector] = true;
        emit LogActionRegistered(msg.sender,
                                 _actionAddress,
                                 _actionSelector
        );
    }
    // ____________________________________________

    // ____________ Deregister Actions ____________
    event LogActionDeregistered(address indexed _registrator,
                                address indexed _actionAddress,
                                bytes4 indexed _actionSelector
    );
    function _deregisterAction(address _actionAddress,
                               bytes4 _actionSelector
    )
        internal
    {
        actions[_actionAddress][_actionSelector] = false;
        emit LogActionDeregistered(msg.sender,
                                   _actionAddress,
                                   _actionSelector
        );
    }
    // ____________________________________________
}