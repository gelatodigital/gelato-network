pragma solidity 0.6.0;

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
    function getUserCount() external view returns(uint256);
    function getUserOfProxy(IGelatoUserProxy _proxy) external view returns(address);
    function isUser(address _user) external view returns(bool);
    function getProxyOfUser(address _user) external view returns(IGelatoUserProxy);
    function isUserProxy(IGelatoUserProxy _userProxy) external view returns(bool);
    function getUsers() external view returns(address[] memory);
    function getUserProxies() external view returns(IGelatoUserProxy[] memory);
    // =========================

    // ============= GELATO_GAS_TEST_USER_PROXY_MANAGER ==============================
    function createGasTestUserProxy() external returns(address gasTestUserProxy);

    function getUserOfGasTestProxy(address _gasTestProxy)
        external
        view
        returns(address);

    function getGasTestProxyOfUser(address _user)
        external
        view
        returns(address);
}
