pragma solidity ^0.6.6;

contract GelatoUserProxyDebug {
    address public immutable user;
    address public gelatoCore;

    constructor(address _user, address _gelatoCore) public payable {
        user = _user;
        gelatoCore = _gelatoCore;
    }
}

contract GelatoUserProxyFactoryDebug {
    address public immutable gelatoCore;

    constructor(address _gelatoCore) public { gelatoCore = _gelatoCore; }

    // This causes the bug: https://github.com/ethereum/solidity/issues/8738
    // function proxyRuntimeCode() public pure returns(bytes memory) {
    //     return type(GelatoUserProxyDebug).runtimeCode;
    // }
}