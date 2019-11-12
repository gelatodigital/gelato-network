pragma solidity ^0.5.10;

contract GelatoUserProxy
{
    address payable internal user;
    address payable internal gelatoCore;

    function getUser() external view returns(address payable) {return user;}
    function getGelatoCore() external view returns(address payable) {return gelatoCore;}

    modifier onlyGelatoCore() {
        require(msg.sender == gelatoCore,
            "GelatoUserProxy.onlyGelatoCore: failed"
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
        onlyGelatoCore
    {
        gelatoCore = _gelatoCore;
    }

    function execute(address _action, bytes calldata _actionPayload)
        external
        payable
        onlyGelatoCore
        returns(bool success, bytes memory returndata)
    {
        (success, returndata) = _action.delegatecall(_actionPayload);
        ///@dev we should delete require later - leave it for testing action executionClaimIds
        require(success, "GelatoUserProxy.execute(): delegatecall failed");
    }
}