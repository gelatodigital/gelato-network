// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;

interface IGnosisSafe {
    enum Operation {Call, DelegateCall}

    event ExecutionFailure(bytes32 txHash, uint256 payment);
    event ExecutionSuccess(bytes32 txHash, uint256 payment);

    function setup(
        address[] calldata _owners,
        uint256 _threshold,
        address to,
        bytes calldata data,
        address fallbackHandler,
        address paymentToken,
        uint256 payment,
        address payable paymentReceiver
    ) external;

    function execTransaction(
        address to,
        uint256 value,
        bytes calldata data,
        Operation operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address payable refundReceiver,
        bytes calldata signatures
    ) external returns (bool success);

    function enableModule(address module) external;
    function disableModule(address prevModule, address module) external;

    function execTransactionFromModuleReturnData(
        address to,
        uint256 value,
        bytes calldata data,
        Operation operation
    ) external returns (bool success, bytes memory returndata);

    function isOwner(address owner) external view returns (bool);
    function getOwners() external view returns (address[] memory);

    function getModules() external view returns (address[] memory);
}
