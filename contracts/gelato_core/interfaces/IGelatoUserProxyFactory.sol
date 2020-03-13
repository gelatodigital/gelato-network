pragma solidity ^0.6.0;

/// @title IGelatoUserProxyManager - solidity interface of GelatoUserProxyManager
/// @notice APIs for GelatoUserProxy creation and registry.
/// @dev all the APIs and events are implemented inside GelatoUserProxyManager
interface IGelatoUserProxyFactory {
    event LogGelatoUserProxyCreation(
        address indexed user,
        address indexed gelatoUserProxy,
        uint256 userProxyFunding
    );

    /// @dev Allows to create new proxy contact and execute a message call to the
    ///      new proxy within one transaction. Emits ProxyCreation.
    /// @param _mastercopy Address of master copy.
    /// @param _initializer Payload for message call sent to new proxy contract.
    /// @return gelatoUserProxy address
    function createGelatoUserProxy(
        address _mastercopy,
        bytes calldata _initializer
    ) external payable returns (address gelatoUserProxy);

    /// @notice Deploys gnosis safe proxy for users that dont have a registered one yet
    /// @dev The initializer data is important for setup magic and UX tricks.
    /// @param _mastercopy the GnosisSafe mastercopy the proxy should point to
    /// @param _initializer data sent for setting up owner and modules
    /// @param _saltNonce this uses create2 under the  hood, so we need a salt
    /// @return gelatoUserProxy address of the deployed GelatoUserProxy
    function createTwoGelatoUserProxy(
        address _mastercopy,
        bytes calldata _initializer,
        uint256 _saltNonce
    ) external payable returns (address gelatoUserProxy);

    /// @notice Deploys gnosis safe proxy for users that dont have a registered one yet
    /// @dev The initializer data is important for setup magic and UX tricks.
    /// @param _mastercopy the GnosisSafe mastercopy the proxy should point to
    /// @param _initializer data sent for setting up owner and modules
    /// @param _saltNonce this uses create2 under the  hood, so we need a salt
    /// @return gelatoUserProxy address of the deployed GelatoUserProxy
    function createThreeGelatoUserProxy(
        address _mastercopy,
        bytes calldata _initializer,
        uint256 _saltNonce
    ) external payable returns (address gelatoUserProxy);

    // ______ State Read APIs __________________
    function userByGelatoProxy(address _gelatoProxy)
        external
        view
        returns (address);
    function gelatoProxyByUser(address _user) external view returns (address);
    function isGelatoProxyUser(address _user) external view returns (bool);
    function isGelatoUserProxy(address _userPoxy) external view returns (bool);
}
