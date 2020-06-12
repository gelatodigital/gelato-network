// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;

interface IOwnable {
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    function owner() external view returns (address);
    function isOwner() external view returns (bool);
    function renounceOwnership() external;
    function transferOwnership(address newOwner) external;
}