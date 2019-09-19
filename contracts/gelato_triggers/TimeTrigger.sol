pragma solidity ^0.5.10;


contract TriggerTimestamp {
    string constant triggerFnSig = "timestampSeNow(uint256)";
    string constant displayFnSig = "getNow()";

    function timestampSeNow(uint256 _timestamp)
        external
        view
        returns(bool)
    {
        return _timestamp <= now;
    }

    function getNow()
        external
        view
        returns(uint256)
    {
        return now;
    }
}