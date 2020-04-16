pragma solidity ^0.6.0;

interface IBatchExchange {

    function withdraw(address user, address token)
        external;

    function deposit(address token, uint256 amount)
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

    function tokenAddressToIdMap(address inst)
        external
        view
        returns (uint16);


    // Returns orderId
    function placeOrder(uint16 buyToken, uint16 sellToken, uint32 validUntil, uint128 buyAmount, uint128 sellAmount)
        external
        returns (uint256);

    function requestFutureWithdraw(address token, uint256 amount, uint32 batchId)
        external;

}
