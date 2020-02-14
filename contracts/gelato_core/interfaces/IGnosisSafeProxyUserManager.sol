pragma solidity ^0.6.0;

import "./IGnosisSafe.sol";

/// @title IGelatoUserProxyManager - solidity interface of GelatoUserProxyManager
/// @notice APIs for GelatoUserProxy creation and registry.
/// @dev all the APIs and events are implemented inside GelatoUserProxyManager
interface IGnosisSafeProxyUserManager {
    event LogGnosisSafeProxyUserCreation(
        address indexed user,
        address indexed gnosisSafeProxy
    );

    function registerAsGnosisSafeProxyUser(address _gnosisSafeProxy) external;
    function registerAsGnosisSafeProxy() external;


    /// @notice Deploys gnosis safe proxy for users that dont have a registered one yet
    /// @dev The initializer data is important for setup magic and UX tricks.
    /// @param _mastercopy the GnosisSafe mastercopy the proxy should point to
    /// @param _initializer data sent for setting up owner and modules
    /// @param _saltNonce this uses create2 under the  hood, so we need a salt
    /// @return gnosisSafeProxy address of the deployed GelatoUserProxy
    function createGnosisSafeProxyWithNonce(
        address _mastercopy,
        bytes calldata _initializer,
        uint256 _saltNonce
    )
     external
     returns(address gnosisSafeProxy);

    // ______ State Read APIs __________________
    function userByGnosisSafeProxy(address _userProxy) external view returns(address);
    function gnosisSafeProxyByUser(address _user) external view returns(IGnosisSafe);
    function isRegisteredUser(address _user) external view returns(bool);
    function isRegisteredGnosisSafeProxy(address _gnosisSafeProxy)
        external
        view
        returns(bool);
}
