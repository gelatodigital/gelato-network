pragma solidity ^0.5.10;

import "./Auth.sol";

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

// ProxyFactory
// This factory deploys new proxy instances through build()
// Deployed proxy addresses are logged
contract ProxyFactory {
    event Created(address indexed sender, address indexed owner, address proxy);
    mapping(address=>bool) public isProxy;

    // deploys a new proxy instance
    // sets owner of proxy to caller
    function build() public returns (address payable proxy) {
        proxy = build(msg.sender);
    }

    // deploys a new proxy instance
    // sets custom owner of proxy
    function build(address owner) public returns (address payable proxy) {
        proxy = address(new Proxy());
        emit Created(msg.sender, owner, address(proxy));
        Proxy(proxy).setOwner(owner);
        isProxy[proxy] = true;
    }
}

