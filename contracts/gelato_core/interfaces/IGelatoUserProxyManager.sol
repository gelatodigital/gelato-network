pragma solidity ^0.6.0;

import "./IGelatoUserProxy.sol";

/// @title IGelatoUserProxyManager - solidity interface of GelatoUserProxyManager
/// @notice APIs for GelatoUserProxy creation and registry.
/// @dev all the APIs and events are implemented inside GelatoUserProxyManager
interface IGelatoUserProxyManager {
    event LogCreateUserProxy(IGelatoUserProxy indexed userProxy, address indexed user);

    /// @notice deploys gelato proxy for users that have no proxy yet
    /// @dev This function should be called for users that have nothing deployed yet
    /// @return address of the deployed GelatoUserProxy
    function createUserProxy() external returns(IGelatoUserProxy);

    // ______ State Read APIs __________________
    function userCount() external view returns(uint256);
    function userByProxy(address _userProxy) external view returns(address);
    function proxyByUser(address _user) external view returns(IGelatoUserProxy);
    function isUser(address _user) external view returns(bool);
    function isUserProxy(address _userProxy) external view returns(bool);
    //function users() external view returns(address[] memory);
    //function userProxies() external view returns(IGelatoUserProxy[] memory);
    // =========================
}
