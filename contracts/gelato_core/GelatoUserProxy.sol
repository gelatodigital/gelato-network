pragma solidity ^0.5.10;

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
        // @dev address.delegatecall does
        (success, returndata) = _action.delegatecall(_actionPayload);
        ///@dev we should delete require later - leave it for testing action executionClaimIds
        require(success, "GelatoUserProxy.execute(): delegatecall failed");
    }
}