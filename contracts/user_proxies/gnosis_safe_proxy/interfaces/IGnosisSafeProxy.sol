// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;

interface IGnosisSafeProxy {
    function masterCopy() external view returns (address);
}