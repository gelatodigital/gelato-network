pragma solidity ^0.6.2;

interface IGnosisSafe {
    enum Operation {
        Call,
        DelegateCall
    }

    function execTransactionFromModule(
        address to,
        uint256 value,
        bytes calldata data,
        Operation operation
    )
        external
        returns (bool success);

    function isOwner(address owner) external view returns (bool);

    function NAME() external pure returns(string memory);
}
