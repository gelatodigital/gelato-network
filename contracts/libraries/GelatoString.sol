// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;

library GelatoString {
    function startsWithOK(string memory _str) internal pure returns(bool) {
        if (bytes(_str).length >= 2 && bytes(_str)[0] == "O" && bytes(_str)[1] == "K")
            return true;
        return false;
    }

    function revertWithInfo(string memory _error, string memory _tracingInfo)
        internal
        pure
    {
        revert(string(abi.encodePacked(_tracingInfo, _error)));
    }
}