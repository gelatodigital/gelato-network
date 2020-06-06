// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.9;

interface IMedianizer {

    function read() external view returns (bytes32);

}
