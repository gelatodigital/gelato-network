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

    function execute(address _action, bytes memory _actionPayload)
        public
        payable
        auth
        returns(bytes memory returndata)
    {
        require(_action != address(0),
            "GelatoUserProxy.execute: invalid _action"
        );

        // call contract in current context
        assembly {
            let succeeded := delegatecall(sub(gas, 5000), _action, add(_actionPayload, 0x20), mload(_actionPayload), 0, 0)
            let size := returndatasize

            returndata := mload(0x40)
            mstore(0x40, add(returndata, and(add(add(size, 0x20), 0x1f), not(0x1f))))
            mstore(returndata, size)
            returndatacopy(add(returndata, 0x20), 0, size)

            switch iszero(succeeded)
            case 1 {
                // throw if delegatecall failed
                revert(add(returndata, 0x20), size)
            }
        }
        // @dev address.delegatecall does
        /*bytes memory actionPayload = _actionPayload;
        (success, returndata) = _action.delegatecall(actionPayload);
        ///@dev we should delete require later - leave it for testing action executionClaimIds
        require(success, "GelatoUserProxy.execute(): delegatecall failed");*/
    }
}