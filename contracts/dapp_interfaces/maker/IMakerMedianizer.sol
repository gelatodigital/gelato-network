// SPDX-License-Identifier: MIT
pragma solidity ^0.6.10;

interface IMedianizer {

    function read() external view returns (bytes32);

}
