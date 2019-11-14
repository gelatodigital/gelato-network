pragma solidity ^0.5.10;

import './GelatoUserProxy.sol';

/// @title GelatoUserProxyManager
/// @dev registry and factory for GelatoUserProxies
contract GelatoUserProxyManager
{
    /// @dev non-deploy base contract
    constructor() internal {}

    uint256 internal userCount;
    mapping(address => address) internal userToProxy;
    mapping(address => address payable) internal proxyToUser;
    address payable[] internal users;
    address[] internal userProxies;

    modifier userHasNoProxy {
        require(userToProxy[msg.sender] == address(0),
            "GelatoUserProxyManager: user already has a proxy"
        );
        _;
    }

    /// @notice deploys gelato proxy for users that have no proxy yet
    /// @dev This function should be called for users that have nothing deployed yet
    /// @return address of the deployed GelatoUserProxy
    function createUserProxy()
        external
        userHasNoProxy
        returns(address userProxy)
    {
        userProxy = address(new GelatoUserProxy(msg.sender));
        userToProxy[msg.sender] = userProxy;
        proxyToUser[userProxy] = msg.sender;
        users.push(msg.sender);
        userProxies.push(userProxy);
        userCount++;
        emit LogCreateUserProxy(userProxy, msg.sender);
    }
    event LogCreateUserProxy(address indexed userProxy, address indexed user);

    // ______________ State Readers ______________________________________
    function _isUser(address _user)
        internal
        view
        returns(bool)
    {
        return userToProxy[_user] != address(0);
    }

    function _isUserProxy(address _userProxy)
        internal
        view
        returns(bool)
    {
        return proxyToUser[_userProxy] != address(0);
    }
    // ______ State Read APIs __________________
    function getUserCount() external view returns(uint256) {return userCount;}

    function getUserOfProxy(address _proxy)
        external
        view
        returns(address payable)
    {
        return proxyToUser[_proxy];
    }

    function isUser(address _user)
        external
        view
        returns(bool)
    {
        return _isUser(_user);
    }

    function getProxyOfUser(address _user)
        external
        view
        returns(address)
    {
        return userToProxy[_user];
    }

    function isUserProxy(address _userProxy)
        external
        view
        returns(bool)
    {
        return _isUserProxy(_userProxy);
    }

    function getUsers()
        external
        view
        returns(address payable[] memory)
    {
        return users;
    }

    function getUserProxies()
        external
        view
        returns(address[] memory)
    {
        return userProxies;
    }
    // =========================
}
