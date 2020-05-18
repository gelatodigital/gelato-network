// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.8;

library GelatoString {
    function startsWithOk(string memory _str) internal pure returns(bool) {
        if (bytes(_str).length >= 2 && bytes(_str)[0] == "O" && bytes(_str)[1] == "K")
            return true;
        return false;
    }
}