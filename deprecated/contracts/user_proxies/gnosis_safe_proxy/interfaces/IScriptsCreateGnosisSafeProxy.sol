// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;

interface IScriptsCreateGnosisSafeProxy {
    event LogGnosisSafeProxyCreation(
        address indexed user,
        address indexed userProxy,
        uint256 userProxyFunding
    );

    /// @dev Allows to create new proxy contact and exec a message call to the
    ///      new proxy within one transaction. Emits ProxyCreation.
    /// @param _mastercopy Address of master copy.
    /// @param _initializer Payload for message call sent to new proxy contract.
    /// @return userProxy address
    function create(address _mastercopy, bytes calldata _initializer)
        external
        payable
        returns (address userProxy);

    /// @notice Deploys gnosis safe proxy for users that dont have a registered one yet
    /// @dev The initializer data is important for setup magic and UX tricks.
    /// @param _mastercopy the GnosisSafe mastercopy the proxy should point to
    /// @param _initializer data sent for setting up owner and modules
    /// @param _saltNonce this uses create2 under the  hood, so we need a salt
    /// @return userProxy address of the deployed GelatoUserProxy
    function createTwo(address _mastercopy, bytes calldata _initializer, uint256 _saltNonce)
        external
        payable
        returns (address userProxy);
}
