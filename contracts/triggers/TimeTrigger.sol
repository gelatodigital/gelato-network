pragma solidity ^0.5.10;

// Trigger for Gelato Protocol
// Aim: Checks if inputted timestamp is lower than now

contract TimeTrigger {

    string constant timestampSmallerThanNowString = "timestampSmallerThanNow(uint256)";

    function timestampSmallerThanNow(uint256 _timestamp)
        public
        view
        returns(bool)
    {
        // return true if timestamp is Smaller than now
        _timestamp <= now ? true : false;
    }

}