pragma solidity ^0.6.2;

import "./interfaces/IGelatoUserProxyFactory.sol";
import "./interfaces/IGnosisSafeProxyFactory.sol";

/// @title GnosisSafeProxyUserManager
/// @notice registry and factory for GnosisSafeProxies
/// @dev find all NatSpecs inside IGelatoProxyFactory
abstract contract GelatoUserProxyFactory is IGelatoUserProxyFactory {

    mapping(address => address) public override userByGelatoProxy;
    mapping(address => IGnosisSafe) public override gelatoProxyByUser;

    // create
    function createGelatoUserProxy(address _mastercopy, bytes calldata _initializer)
        external
        override
        returns(IGnosisSafe userProxy)
    {
        IGnosisSafeProxyFactory factory = IGnosisSafeProxyFactory(
            0x76E2cFc1F5Fa8F6a5b3fC4c8F4788F0116861F9B
        );
        userProxy = factory.createProxy(_mastercopy, _initializer);
        userByGelatoProxy[address(userProxy)] = msg.sender;
        gelatoProxyByUser[msg.sender] = userProxy;
        emit LogGelatoUserProxyCreation(msg.sender, userProxy);
    }

    // create2
    function createTwoGelatoUserProxy(
        address _mastercopy,
        bytes calldata _initializer,
        uint256 _saltNonce
    )
        external
        override
        returns(IGnosisSafe userProxy)
    {
        IGnosisSafeProxyFactory factory = IGnosisSafeProxyFactory(
            0x76E2cFc1F5Fa8F6a5b3fC4c8F4788F0116861F9B
        );
        userProxy = factory.createProxyWithNonce(_mastercopy, _initializer, _saltNonce);
        userByGelatoProxy[address(userProxy)] = msg.sender;
        gelatoProxyByUser[msg.sender] = userProxy;
        emit LogGelatoUserProxyCreation(msg.sender, userProxy);
    }

    // Checks
    function isGelatoProxyUser(address _user)
        public
        view
        override
        returns(bool)
    {
        return gelatoProxyByUser[_user] != IGnosisSafe(0);
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