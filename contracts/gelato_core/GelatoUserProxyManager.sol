pragma solidity ^0.6.0;

import "./interfaces/IGelatoUserProxyManager.sol";
import "./gas_tests/GelatoGasTestUserProxyManager.sol";

/// @title GelatoUserProxyManager
/// @notice registry and factory for GelatoUserProxies
/// @dev find all NatSpecs inside IGelatoUserProxyManager
abstract contract GelatoUserProxyManager is IGelatoUserProxyManager, GelatoGasTestUserProxyManager {

    uint256 internal userCount;
    mapping(address => IGelatoUserProxy) internal userToProxy;
    mapping(address => address) internal proxyToUser;
    address[] internal users;
    IGelatoUserProxy[] internal userProxies;

    modifier userHasNoProxy {
        require(
            userToProxy[msg.sender] == IGelatoUserProxy(0),
            "GelatoUserProxyManager: user already has a proxy"
        );
        _;
    }

    modifier userProxyCheck(IGelatoUserProxy _userProxy) {
        require(
            _isUserProxy(address(_userProxy)),
            "GelatoUserProxyManager.userProxyCheck: _userProxy not registered"
        );
        _;
    }

    function createUserProxy()
        external
        override
        userHasNoProxy
        returns(IGelatoUserProxy userProxy)
    {
        userProxy = new GelatoUserProxy(msg.sender);
        userToProxy[msg.sender] = userProxy;
        proxyToUser[address(userProxy)] = msg.sender;
        users.push(msg.sender);
        userProxies.push(userProxy);
        userCount++;
        emit LogCreateUserProxy(userProxy, msg.sender);
    }

    // ______ State Read APIs __________________
    function getUserCount() external view override returns(uint256) {return userCount;}

    function getUserOfProxy(IGelatoUserProxy _proxy)
        external
        view
        override
        returns(address)
    {
        return proxyToUser[address(_proxy)];
    }

    function isUser(address _user)
        external
        view
        override
        returns(bool)
    {
        return _isUser(_user);
    }

    function getProxyOfUser(address _user)
        external
        view
        override
        returns(IGelatoUserProxy)
    {
        return userToProxy[_user];
    }

    function isUserProxy(IGelatoUserProxy _userProxy)
        external
        view
        override
        returns(bool)
    {
        return _isUserProxy(address(_userProxy));
    }

    function getUsers()
        external
        view
        override
        returns(address[] memory)
    {
        return users;
    }

    function getUserProxies()
        external
        view
        override
        returns(IGelatoUserProxy[] memory)
    {
        return userProxies;
    }

    // ______________ State Readers ______________________________________
    function _isUser(address _user)
        internal
        view
        returns(bool)
    {
        return userToProxy[_user] != IGelatoUserProxy(0);
    }

    function _isUserProxy(address _userProxy)
        internal
        view
        returns(bool)
    {
        return proxyToUser[_userProxy] != address(0);
    }
    // =========================
}
