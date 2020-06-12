// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;

import "./IGnosisSafe.sol";

interface IGnosisSafeProxyFactory {

    event ProxyCreation(address proxy);

    /// @dev Allows to create new proxy contact and exec a message call to the
    ///      new proxy within one transaction. Emits ProxyCreation.
    /// @param masterCopy Address of master copy.
    /// @param data Payload for message call sent to new proxy contract.
    /// @return proxy address
    function createProxy(address masterCopy, bytes calldata data)
        external
        returns (IGnosisSafe proxy);

    /// @dev Allows to create new proxy contact and exec a message call to the
    ///      new proxy within one transaction. Emits ProxyCreation.
    /// @param _mastercopy Address of master copy.
    /// @param initializer Payload for message call sent to new proxy contract.
    /// @param saltNonce Nonce that will be used to generate the salt to calculate the
    ///                   address of the new proxy contract.
    /// @return proxy address
    function createProxyWithNonce(
        address _mastercopy,
        bytes calldata initializer,
        uint256 saltNonce
    )
        external
        returns (IGnosisSafe proxy);

    /// @dev Allows to create new proxy contact, exec a message call to the
    //       new proxy and call a specified callback within one transaction
    /// @param _mastercopy Address of master copy.
    /// @param initializer Payload for message call sent to new proxy contract.
    /// @param saltNonce Nonce that will be used to generate the salt to calculate
    ///                  the address of the new proxy contract.
    /// @param callback Callback that will be invoced after the new proxy contract
    ///                 has been successfully deployed and initialized.
    function createProxyWithCallback(
        address _mastercopy,
        bytes calldata initializer,
        uint256 saltNonce,
        IProxyCreationCallback callback
    )
        external
        returns (IGnosisSafe proxy);

    /// @dev Allows to get the address for a new proxy contact created via `createProxyWithNonce`
    ///      This method is only meant for address calculation purpose when you use an
    ///      initializer that would revert, therefore the response is returned with a revert.
    ///      When calling this method set `from` to the address of the proxy factory.
    /// @param _mastercopy Address of master copy.
    /// @param initializer Payload for message call sent to new proxy contract.
    /// @param saltNonce Nonce that will be used to generate the salt to calculate the
    ///                  address of the new proxy contract.
    /// @return proxy address from a revert() reason string message
    function calculateCreateProxyWithNonceAddress(
        address _mastercopy,
        bytes calldata initializer,
        uint256 saltNonce
    )
        external
        returns (address proxy);

    /// @dev Allows to retrieve the runtime code of a deployed Proxy.
    ///      This can be used to check that the expected Proxy was deployed.
    /// @return proxysRuntimeBytecode bytes
    function proxyRuntimeCode() external pure returns (bytes memory);

    /// @dev Allows to retrieve the creation code used for the Proxy deployment.
    ///      With this it is easily possible to calculate predicted address.
    /// @return proxysCreationCode bytes
    function proxyCreationCode() external pure returns (bytes memory);

}

interface IProxyCreationCallback {
    function proxyCreated(
        address proxy,
        address _mastercopy,
        bytes calldata initializer,
        uint256 saltNonce
    )
        external;
}