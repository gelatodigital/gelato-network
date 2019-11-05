import "@openzeppelin/upgrades/contracts/Initializable.sol";

pragma solidity ^0.5.10;

contract Auth is Initializable
{
    address public gelatoCore;
    address public owner;

    function initialize(address _owner,
                        address _gelatoCore
    )
        external
        initializer
    {
        owner = _owner;
        gelatoCore = _gelatoCore;
    }

    function setOwner(address _newOwner)
        external
        auth
    {
        owner = _newOwner;
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