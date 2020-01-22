pragma solidity ^0.6.0;

import "./interfaces/IGelatoUserProxyManager.sol";
import "./gas_tests/GelatoGasTestUserProxyManager.sol";

/// @title GelatoUserProxyManager
/// @notice registry and factory for GelatoUserProxies
/// @dev find all NatSpecs inside IGelatoUserProxyManager
abstract contract GelatoUserProxyManager is IGelatoUserProxyManager, GelatoGasTestUserProxyManager {

    uint256 public override userCount;
    mapping(address => address) public override userByProxy;
    mapping(address => IGelatoUserProxy) public override proxyByUser;
    // public override doesnt work for storage arrays
    address[] public users;
    IGelatoUserProxy[] public userProxies;

    modifier userHasNoProxy {
        require(
            userByProxy[msg.sender] == address(0),
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
        userByProxy[address(userProxy)] = msg.sender;
        proxyByUser[msg.sender] = userProxy;
        users.push(msg.sender);
        userProxies.push(userProxy);
        userCount++;
        emit LogCreateUserProxy(userProxy, msg.sender);
    }

    // ______ State Read APIs __________________
    function isUser(address _user)
        external
        view
        override
        returns(bool)
    {
        return _isUser(_user);
    }

    function isUserProxy(address _userProxy)
        external
        view
        override
        returns(bool)
    {
        return _isUserProxy(_userProxy);
    }

    // ______________ State Readers ______________________________________
    function _isUser(address _user)
        internal
        view
        returns(bool)
    {
        return proxyByUser[_user] != IGelatoUserProxy(0);
    }

    function _isUserProxy(address _userProxy)
        internal
        view
        returns(bool)
    {
        return userByProxy[_userProxy] != address(0);
    }
    // =========================
}
