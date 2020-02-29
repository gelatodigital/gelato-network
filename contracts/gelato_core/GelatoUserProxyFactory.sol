pragma solidity ^0.6.2;

import "./interfaces/IGelatoUserProxyFactory.sol";
import "./interfaces/IGnosisSafeProxyFactory.sol";
import "../external/Address.sol";

/// @title GnosisSafeProxyUserManager
/// @notice registry and factory for GnosisSafeProxies
/// @dev find all NatSpecs inside IGelatoProxyFactory
abstract contract GelatoUserProxyFactory is IGelatoUserProxyFactory {

    using Address for address payable;  /// for oz's sendValue method

    mapping(address => address) public override userByGelatoProxy;
    mapping(address => address) public override gelatoProxyByUser;

    // create
    function createGelatoUserProxy(address _mastercopy, bytes calldata _initializer)
        external
        payable
        override
        returns(address userProxy)
    {
        IGnosisSafeProxyFactory factory = IGnosisSafeProxyFactory(
            0x76E2cFc1F5Fa8F6a5b3fC4c8F4788F0116861F9B
        );
        userProxy = address(factory.createProxy(_mastercopy, _initializer));
        if (msg.value > 0) payable(userProxy).sendValue(msg.value);
        userByGelatoProxy[address(userProxy)] = msg.sender;
        gelatoProxyByUser[msg.sender] = userProxy;
        emit LogGelatoUserProxyCreation(msg.sender, userProxy, msg.value);
    }

    // create2
    function createTwoGelatoUserProxy(
        address _mastercopy,
        bytes calldata _initializer,
        uint256 _saltNonce
    )
        external
        payable
        override
        returns(address userProxy)
    {
        IGnosisSafeProxyFactory factory = IGnosisSafeProxyFactory(
            0x76E2cFc1F5Fa8F6a5b3fC4c8F4788F0116861F9B
        );
        userProxy = address(factory.createProxyWithNonce(
            _mastercopy,
            _initializer,
            _saltNonce)
        );
        if (msg.value > 0) payable(userProxy).sendValue(msg.value);
        userByGelatoProxy[userProxy] = msg.sender;
        gelatoProxyByUser[msg.sender] = userProxy;
        emit LogGelatoUserProxyCreation(msg.sender, userProxy, msg.value);
    }

    // Checks
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

    function _userProxyCheck(address _userProxy) internal view {
        require(
            isGelatoUserProxy(_userProxy),
            "GelatoUserProxyFactory.userProxyCheck: invalid _userProxy"
        );
    }
}