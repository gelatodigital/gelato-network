pragma solidity ^0.5.10;

import '../../GTA/gelato_actions/gelato_action_standards/IGelatoAction.sol';

contract GelatoActionRegistry {
    // action => functionSelector
    mapping(address => mapping(bytes4 => bool)) public actions;

    function _getActionGasStipend(address _action)
        internal
        view
        returns(uint256 actionGasStipend)
    {
        actionGasStipend = IGelatoAction(_action).actionGasStipend();
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
    // ===========

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
    // ===========

    // ____________ Standard Checks _____________________________________
    modifier onlyRegisteredActions(address _action,
                                   bytes4 _actionSelector)
    {
        require(actions[_action][_actionSelector],
            "GelatoActionRegistry.onlyRegisteredActions: failed"
        );
        _;
    }

     modifier matchingActionSelector(address _action,
                                     bytes4 _actionSelector)
    {
        require(IGelatoAction(_action).matchingActionSelector(_actionSelector),
            "GelatoActionRegistry.matchingActionSelector: failed"
        );
        _;
    }

    modifier msgSenderIsRegisteredAction() {
        require(actions[msg.sender] != bytes4(0),
            "GelatoActionRegistry.msgSenderIsRegisteredAction: failed"
        );
        _;
    }
    // ===========

    // ____________ Additional Checks _____________________________________
    modifier actionConditionsFulfilled(address _action,
                                       bytes memory _payload)
    {
        require(IGelatoAction(_action).conditionsFulfilled(_payload),
            "GelatoActionRegistry.actionConditionsFulfilled: failed"
        );
        _;
    }

    modifier actionHasERC20Allowance(address _action,
                                     address _token,
                                     address _tokenOwner,
                                     uint256 _allowance)
    {
        require(IGelatoAction(_action).hasERC20Allowance(_token,
                                                         _tokenOwner,
                                                         _allowance),
            "GelatoActionRegistry.actionHasERC20Allowance: failed"
        );
        _;
    }
    // ===========
}