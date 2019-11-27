pragma solidity ^0.5.10;

import "./IGelatoUserProxy.sol";

/// @title GelatoUserProxyManager
/// @dev registry and factory for GelatoUserProxies
interface IGelatoUserProxyManager {
    event LogCreateUserProxy(IGelatoUserProxy indexed userProxy, address indexed user);
    /// @notice deploys gelato proxy for users that have no proxy yet
    /// @dev This function should be called for users that have nothing deployed yet
    /// @return address of the deployed GelatoUserProxy
    function createUserProxy() external returns(IGelatoUserProxy);

    // ______ State Read APIs __________________
    function getUserCount() external view returns(uint256);
    function getUserOfProxy(IGelatoUserProxy _proxy) external view returns(address payable);
    function isUser(address _user) external view returns(bool);
    function getProxyOfUser(address _user) external view returns(IGelatoUserProxy);
    function isUserProxy(IGelatoUserProxy _userProxy) external view returns(bool);
    function getUsers() external view returns(address payable[] memory);
    function getUserProxies() external view returns(IGelatoUserProxy[] memory);
    // =========================
}
