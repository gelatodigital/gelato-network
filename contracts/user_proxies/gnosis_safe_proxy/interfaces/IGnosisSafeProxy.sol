pragma solidity ^0.6.8;

interface IGnosisSafeProxy {
    function masterCopy() external view returns (address);
}