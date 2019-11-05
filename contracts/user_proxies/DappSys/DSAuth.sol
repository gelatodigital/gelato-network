pragma solidity ^0.5.10;

contract DSAuth
{
    address public  gelatoCore;
    address public  owner;

    constructor() public {
        owner = msg.sender;
    }

    function setGelatoCore(address _gelatoCore)
        external
        auth
    {
        gelatoCore = _gelatoCore;
    }

    modifier auth {
        require(isAuthorized(msg.sender), "ds-auth-unauthorized");
        _;
    }

    function isAuthorized(address src) internal view returns (bool) {
        if (src == address(this)) {
            return true;
        } else if (src == owner) {
            return true;
        } else if (src == gelatoCore) {
            return true;
        } else {
            return false;
        }
    }
}