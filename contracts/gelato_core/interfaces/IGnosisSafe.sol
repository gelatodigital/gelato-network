pragma solidity ^0.6.2;

interface IGnosisSafe {
    enum Operation {
        Call,
        DelegateCall
    }

    function setup(
        address[] calldata _owners,
        uint256 _threshold,
        address to,
        bytes calldata data,
        address fallbackHandler,
        address paymentToken,
        uint256 payment,
        address payable paymentReceiver
    )
        external;

    function execTransactionFromModuleReturnData(
        address to,
        uint256 value,
        bytes calldata data,
        Operation operation
    )
        external
        returns (bool success, bytes memory returndata);

    function isOwner(address owner) external view returns (bool);
}
