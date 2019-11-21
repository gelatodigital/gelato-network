pragma solidity ^0.5.10;

import '../triggers_actions/actions/GelatoActionsStandard';

contract GelatoUserProxy
{
    address payable internal user;
    address payable internal gelatoCore;

    function getUser() external view returns(address payable) {return user;}
    function getGelatoCore() external view returns(address payable) {return gelatoCore;}

    modifier auth() {
        require(msg.sender == user || msg.sender == gelatoCore,
            "GelatoUserProxy.auth: failed"
        );
        _;
    }

    constructor(address payable _user)
        public
    {
        user = _user;
        gelatoCore = msg.sender;
    }

    function setGelatoCore(address payable _gelatoCore)
        external
        auth
    {
        gelatoCore = _gelatoCore;
    }

    function execute(address _action, bytes calldata _actionPayload)
        external
        payable
        auth
        returns(bool success, bytes memory returndata)
    {
        require(_action != address(0),
            "GelatoUserProxy.execute: invalid _action"
        );
        ActionOperation operation = GelatoActionsStandard(_action).getActionOperation();
        require(operation == ActionOperation.call || operation == ActionOperation.delegatecall,
            "GelatoUserProxy.execute(): invalid action operation"
        );
        if (operation == ActionOperation.call) {
            (success, returndata) = _action.call(_actionPayload);
            ///@dev we should delete require later - leave it for testing action executionClaimIds
            require(success, "GelatoUserProxy.execute(): _action.call failed");
        } else {
            (success, returndata) = _action.delegatecall(_actionPayload);
            ///@dev we should delete require later - leave it for testing action executionClaimIds
            require(success, "GelatoUserProxy.execute(): _action.delegatecall failed");
        }
    }
}