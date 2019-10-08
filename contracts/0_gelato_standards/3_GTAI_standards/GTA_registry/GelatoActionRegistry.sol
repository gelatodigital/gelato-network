pragma solidity ^0.5.10;

import '../../../0_gelato_standards/2_GTA_standards/gelato_action_standards/IGelatoAction.sol';

contract GelatoActionRegistry {
    // action => executionClaimLifespan
    mapping(address => uint256) public actionExecutionClaimLifespan;

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
                              address indexed _actionAddress,
                              uint256 executionClaimLifespan
    );
    function _registerAction(address _actionAddress,
                             uint256 _executionClaimLifespan
    )
        internal
    {
        actionExecutionClaimLifespan[_actionAddress] = _executionClaimLifespan;
        emit LogActionRegistered(msg.sender,
                                 _actionAddress,
                                 _executionClaimLifespan
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
        actionExecutionClaimLifespan[_actionAddress] = 0;
        emit LogActionDeregistered(msg.sender,
                                   _actionAddress
        );
    }
    // ===========

    // ____________ Standard Checks _____________________________________
    modifier onlyRegisteredActions(address _action)
    {
        require(actionExecutionClaimLifespan[_action],
            "GelatoActionRegistry.onlyRegisteredActions: failed"
        );
        _;
    }

    modifier msgSenderIsRegisteredAction() {
        require(actionExecutionClaimLifespan[msg.sender],
            "GelatoActionRegistry.msgSenderIsRegisteredAction: failed"
        );
        _;
    }
    // ===========

    // ____________ Additional Checks _____________________________________
    function _actionConditionsFulfilled(address _action,
                                        address _user,
                                        bytes memory _specificActionParams
    )
        internal
        view
        returns(bool)
    {
        return IGelatoAction(_action).actionConditionsFulfilled(_user,
                                                                _specificActionParams
        );
    }

    modifier actionConditionsFulfilled(address _action,
                                       bytes memory _specificActionParams)
    {
        require(_actionConditionsFulfilled(_action, _specificActionParams),
            "GelatoActionRegistry.actionConditionsFulfilled: failed"
        );
        _;
    }
    // ===========
}