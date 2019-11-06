pragma solidity ^0.5.10;

import './Proxy.sol';
import './ProxyFactory.sol';
import "@openzeppelin/upgrades/contracts/Initializable.sol";

// This Registry deploys new proxy instances through ProxyFactory.build(address)
//   and keeps a registry of owner => proxy
contract ProxyRegistry is Initializable {
    mapping(address => Proxy) public proxies;
    mapping(address => bool) public registeredProxy;

    ProxyFactory internal factory;

    function initialize(address factory_)
        external
        initializer
    {
        factory = ProxyFactory(factory_);
    }

    // deploys a new proxy instance
    // sets owner of proxy to caller
    function build() public returns (address proxy) {
        proxy = build(msg.sender);
    }

    // deploys a new proxy instance
    // sets custom owner of proxy
    function build(address owner) public returns (address proxy) {
        require(proxies[owner] == Proxy(0) || proxies[owner].owner() != owner); // Not allow new proxy if the user already has one and remains being the owner
        proxy = factory.build(owner);
        proxies[owner] = Proxy(proxy);
        registeredProxy[proxy] = true;
    }
}