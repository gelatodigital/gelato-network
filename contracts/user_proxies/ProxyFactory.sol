pragma solidity ^0.5.10;

import "./Proxy.sol";

// ProxyFactory
// This factory deploys new proxy instances through build()
// Deployed proxy addresses are logged
contract ProxyFactory {
    event Created(address indexed sender, address indexed owner, address proxy);
    mapping(address=>bool) public isProxy;

    // deploys a new proxy instance
    // sets owner of proxy to caller
    function build() public returns (address proxy) {
        proxy = build(msg.sender);
    }

    // deploys a new proxy instance
    // sets custom owner of proxy
    function build(address owner) public returns (address proxy) {
        Proxy proxyContract = new Proxy();
        address gelatoCoreProxyRinkeby
            = 0x0e7dDacA829CD452FF341CF81aC6Ae4f0D2328A7;
        proxyContract.initialize(owner, gelatoCoreProxyRinkeby);
        proxy = address(proxyContract);
        emit Created(msg.sender, owner, proxy);
        isProxy[proxy] = true;
    }
}