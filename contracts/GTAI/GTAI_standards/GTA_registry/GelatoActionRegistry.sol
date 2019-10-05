pragma solidity ^0.5.10;

import '../../../GTA/gelato_actions/gelato_action_standards/IGelatoAction.sol';

contract GelatoActionRegistry {
    // action => functionSelector
    mapping(address => bool) public actions;

    function _getActionSelector(address _action)
        internal
        view
        returns(bytes4 actionSelector)
    {
        actionSelector = IGelatoAction(_action).actionSelector();
    }

    function _getActionGasStipend(address _action)
        internal
        view
        returns(uint256 actionGasStipend)
    {
        actionGasStipend = IGelatoAction(_action).actionGasStipend();
    }

    // ____________ Register Actions ____________
    event LogActionRegistered(address indexed _registrator,
                              address indexed _actionAddress
    );
    function _registerAction(address _actionAddress)
        internal
    {
        actions[_actionAddress] = true;
        emit LogActionRegistered(msg.sender,
                                 _actionAddress
        );
    }
    // ===========

    // ____________ Deregister Actions ____________
    event LogActionDeregistered(address indexed _registrator,
                                address indexed _actionAddress
    );
    function _deregisterAction(address _actionAddress)
        internal
    {
        actions[_actionAddress] = false;
        emit LogActionDeregistered(msg.sender,
                                   _actionAddress
        );
    }
    // ===========

    // ____________ Standard Checks _____________________________________
    modifier onlyRegisteredActions(address _action)
    {
        require(actions[_action],
            "GelatoActionRegistry.onlyRegisteredActions: failed"
        );
        _;
    }

    modifier msgSenderIsRegisteredAction() {
        require(actions[msg.sender],
            "GelatoActionRegistry.msgSenderIsRegisteredAction: failed"
        );
        _;
    }
    // ===========

    // ____________ Additional Checks _____________________________________
    function _actionConditionsFulfilled(address _action,
                                        bytes memory _actionPayload
    )
        internal
        view
        returns(bool)
    {
        if (IGelatoAction(_action).actionConditionsFulfilled(_actionPayload)) {
            return true;
        } else {
            return false;
        }
    }

    modifier actionConditionsFulfilled(address _action,
                                       bytes memory _actionPayload)
    {
        require(_actionConditionsFulfilled(_action, _actionPayload),
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