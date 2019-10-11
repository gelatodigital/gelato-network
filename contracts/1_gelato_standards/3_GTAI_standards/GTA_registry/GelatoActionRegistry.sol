pragma solidity ^0.5.10;

import '../../../0_gelato_interfaces/1_GTA_interfaces/gelato_action_interfaces/IGelatoAction.sol';

contract GelatoActionRegistry {
    // to make clear that this is not a standalone-deployment contract
    constructor() internal {}

    // action => _actionExecutionClaimLifespanCap
    mapping(address => uint256) internal _actionExecutionClaimLifespanCap;

    function getActionExecutionClaimLifespanCap(address _action)
        external
        view
        returns(uint256 actionExecutionClaimLifespanCap)
    {
        actionExecutionClaimLifespanCap = _actionExecutionClaimLifespanCap[_action];
    }

    function _getActionSelector(address _action)
        internal
        view
        returns(bytes4 actionSelector)
    {
        actionSelector = IGelatoAction(_action).getActionSelector();
    }

    // ____________ Register Actions ____________
    event LogActionRegistered(address indexed _registrator,
                              address indexed _action,
                              uint256 _actionExecutionClaimLifespanCap
    );
    function _registerAction(address _action,
                             uint256 __actionExecutionClaimLifespanCap
    )
        internal
    {
        _actionExecutionClaimLifespanCap[_action] = __actionExecutionClaimLifespanCap;
        emit LogActionRegistered(msg.sender,
                                 _action,
                                 __actionExecutionClaimLifespanCap
        );
    }
    // ===========

    // ____________ Deregister Actions ____________
    event LogActionDeregistered(address indexed _registrator,
                                address indexed _action
    );
    function _deregisterAction(address _action)
        internal
    {
        _actionExecutionClaimLifespanCap[_action] = 0;
        emit LogActionDeregistered(msg.sender,
                                   _action
        );
    }
    // ===========

    // ____________ Standard Checks _____________________________________
    modifier onlyRegisteredActions(address _action,
                                   uint256 _executionClaimLifespan)
    {
        uint256 executionClaimLifespanCap = _actionExecutionClaimLifespanCap[_action];
        require(executionClaimLifespanCap != 0,
            "GelatoActionRegistry.onlyRegisteredActions: action is not registered"
        );
        require(_executionClaimLifespan <= executionClaimLifespanCap,
            "GelatoActionRegistry.onlyRegisteredActions: _executionClaimLifespan above cap"
        );
        _;
    }

    modifier msgSenderIsRegisteredAction() {
        require(_actionExecutionClaimLifespanCap[msg.sender] != 0,
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
                                       address _user,
                                       bytes memory _specificActionParams
    )
    {
        require(_actionConditionsFulfilled(_action,
                                           _user,
                                           _specificActionParams),
            "GelatoActionRegistry.actionConditionsFulfilled: failed"
        );
        _;
    }
    // ===========
}