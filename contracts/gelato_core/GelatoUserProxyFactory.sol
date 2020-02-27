pragma solidity ^0.6.2;

import "./interfaces/IGelatoUserProxyFactory.sol";
import "./gelato_user_proxies/IGnosisSafeProxyFactory.sol";

/// @title GnosisSafeProxyUserManager
/// @notice registry and factory for GnosisSafeProxies
/// @dev find all NatSpecs inside IGelatoProxyFactory
abstract contract GelatoUserProxyFactory is IGelatoUserProxyFactory {
    //      proxy   => user
    mapping(address => address) public override userByGelatoProxy;
    //      user    => proxy
    mapping(address => address) public override gelatoProxyByUser;

    // ======= Create
    function createGelatoUserProxy(address _mastercopy, bytes calldata _initializer)
        external
        override
        returns(address userProxy)
    {
        IGnosisSafeProxyFactory factory = IGnosisSafeProxyFactory(
            0x76E2cFc1F5Fa8F6a5b3fC4c8F4788F0116861F9B
        );
        userProxy = address(factory.createProxy(_mastercopy, _initializer));
        userByGelatoProxy[userProxy] = msg.sender;
        gelatoProxyByUser[msg.sender] = userProxy;
        emit LogGelatoUserProxyCreation(msg.sender, userProxy);
    }

    function createTwoGelatoUserProxy(
        address _mastercopy,
        bytes calldata _initializer,
        uint256 _saltNonce
    )
        external
        override
        returns(address userProxy)
    {
        IGnosisSafeProxyFactory factory = IGnosisSafeProxyFactory(
            0x76E2cFc1F5Fa8F6a5b3fC4c8F4788F0116861F9B
        );
        userProxy = address(factory.createProxyWithNonce(_mastercopy, _initializer, _saltNonce));
        userByGelatoProxy[userProxy] = msg.sender;
        gelatoProxyByUser[msg.sender] = userProxy;
        emit LogGelatoUserProxyCreation(msg.sender, userProxy);
    }


    // ====== Checks
    function isGelatoProxyUser(address _user)
        public
        view
        override
        returns(bool)
    {
        return gelatoProxyByUser[_user] != address(0);
    }

    function isGelatoUserProxy(address userPoxy)
        public
        view
        override
        returns(bool)
    {
        return userByGelatoProxy[userPoxy] != address(0);
    }
}