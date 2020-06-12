// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;

interface IMaker {

    function read() external view returns (bytes32);

}

contract Medianizer2 {

    function read() pure public returns(bytes32) {
        return bytes32(0x0000000000000000000000000000000000000000000000095388dc7e36340000);
    }


    function returnEthUsd()
        public
        pure
        returns(uint256)
    {
        return uint256(read());
    }

}