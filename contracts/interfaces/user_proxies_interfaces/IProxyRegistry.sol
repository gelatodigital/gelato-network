pragma solidity ^0.5.10;

import '../../user_proxies/Proxy.sol';

interface IProxyRegistry {
    function proxies(address) external view returns(Proxy);
    function registeredProxy(address) external view returns(bool);
    function build() external returns(address payable);
    function build(address) external returns (address payable);
}