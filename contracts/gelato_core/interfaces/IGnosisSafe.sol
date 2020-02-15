pragma solidity ^0.6.2;

interface IGnosisSafe {
    enum Operation {
        Call,
        DelegateCall
    }

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
