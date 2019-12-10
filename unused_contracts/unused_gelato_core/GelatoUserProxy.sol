pragma solidity ^0.5.11;

import "../actions/GelatoUpgradeableActionsStandard.sol";

contract GelatoUserProxy {
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

    modifier noZeroAddress(address _) {
        require(_ != address(0),
            "GelatoUserProxy.noZeroAddress"
        );
        _;
    }

    constructor(address payable _user)
        public
        noZeroAddress(_user)
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

    function execute(address payable _action, bytes calldata _actionPayloadWithSelector)
        external
        payable
        auth
        noZeroAddress(_action)
        returns(bool success, bytes memory returndata)
    {
        GelatoActionsStandard.ActionOperation operation = GelatoActionsStandard(_action).getActionOperation();
        if (operation == GelatoActionsStandard.ActionOperation.call) {
            (success, returndata) = _action.call(_actionPayloadWithSelector);
            ///@dev we should delete require later - leave it for testing action executionClaimIds
            require(success, "GelatoUserProxy.execute(): _action.call failed");
        }
        else if (operation == GelatoActionsStandard.ActionOperation.delegatecall) {
            (success, returndata) = _action.delegatecall(_actionPayloadWithSelector);
            ///@dev we should delete require later - leave it for testing action executionClaimIds
            require(success, "GelatoUserProxy.execute(): _action.delegatecall failed");
        }
        else if (operation == GelatoActionsStandard.ActionOperation.delegatecall) {
            address actionImpl = GelatoUpgradeableActionsStandard(_action).askProxyForImplementationAddress();
            require(GelatoUpgradeableActionsStandard(actionImpl).askImplementationIfInit(),
                "GelatoUserProxy.execute(): actionImpl not initialized"
            );
            (success, returndata) = actionImpl.delegatecall(_actionPayloadWithSelector);
            ///@dev we should delete require later - leave it for testing action executionClaimIds
            require(success, "GelatoUserProxy.execute(): actionImpl.delegatecall failed");
        }
        else {
            revert("GelatoUserProxy.execute(): invalid action operation");
        }
    }
}