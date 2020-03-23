pragma solidity ^0.6.0;

interface IBatchExchange {

    function withdraw(address user, address token)
        external;

    function getPendingWithdraw(address user, address token)
        external
        view
        returns (uint256, uint32);

    function getCurrentBatchId()
        external
        view
        returns (uint32);

    function hasValidWithdrawRequest(address user, address token)
        external
        view
        returns (bool);

}
