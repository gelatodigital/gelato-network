pragma solidity ^0.5.10;

import '../../user_proxies/DappSys/DSProxy.sol';

interface IProxyRegistry {
    function proxies(address) external view returns(DSProxy);
    function build() external returns(address payable);
    function build(address) external returns (address payable);
}