pragma solidity ^0.6.6;

interface IMaker {

    function read() external view returns (bytes32);

}

contract Medianizer2 {

    function read() pure public returns(bytes32) {
        return bytes32(0x0000000000000000000000000000000000000000000000095388dc7e36340000);
    }


    function testView()
        public
        pure
        returns(uint256)
    {
        uint256 etherUSDPrice = uint256(read());
        return 1 ether * 3 ether / etherUSDPrice;
        // return 1 ether * 3 ether /
    }

}