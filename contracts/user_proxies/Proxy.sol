pragma solidity ^0.5.10;

import "@openzeppelin/upgrades/contracts/Initializable.sol";

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

// Proxy
// Allows code execution using a persistant identity This can be very
// useful to execute a sequence of atomic actions. Since the owner of
// the proxy can be changed, this allows for dynamic ownership models
// i.e. a multisig
contract Proxy is Auth
{
    function() external payable {}

    function execute(address _target, bytes memory _data)
        public
        auth
        payable
        returns (bytes memory response)
    {
        require(_target != address(0), "ds-proxy-target-address-required");

        // call contract in current context
        assembly {
            let succeeded := delegatecall(sub(gas, 5000), _target, add(_data, 0x20), mload(_data), 0, 0)
            let size := returndatasize

            response := mload(0x40)
            mstore(0x40, add(response, and(add(add(size, 0x20), 0x1f), not(0x1f))))
            mstore(response, size)
            returndatacopy(add(response, 0x20), 0, size)

            switch iszero(succeeded)
            case 1 {
                // throw if delegatecall failed
                revert(add(response, 0x20), size)
            }
        }
    }
}
