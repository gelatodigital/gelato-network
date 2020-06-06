// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;

interface IGnosisSafeProxy {
    function masterCopy() external view returns (address);
}