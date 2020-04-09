pragma solidity ^0.6.6;

interface IGnosisSafeProxy {
    function masterCopy() external view returns (address);
}