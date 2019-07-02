pragma solidity ^0.5.2;

import './base/Proxy.sol';

contract GelatoCoreProxy is Proxy {
    constructor(address _masterCopy) public Proxy(_masterCopy) {}
}