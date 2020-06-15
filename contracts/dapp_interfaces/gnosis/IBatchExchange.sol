// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

struct Order {
        uint16 buyToken;
        uint16 sellToken;
        uint32 validFrom; // order is valid from auction collection period: validFrom inclusive
        uint32 validUntil; // order is valid till auction collection period: validUntil inclusive
        uint128 priceNumerator;
        uint128 priceDenominator;
        uint128 usedAmount; // remainingAmount = priceDenominator - usedAmount
}

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

    function tokenAddressToIdMap(address addr)
        external
        view
        returns (uint16);

    function orders(address userAddress)
        external
        view
        returns (Order[] memory);


    // Returns orderId
    function placeOrder(uint16 buyToken, uint16 sellToken, uint32 validUntil, uint128 buyAmount, uint128 sellAmount)
        external
        returns (uint256);

    function requestFutureWithdraw(address token, uint256 amount, uint32 batchId)
        external;

    function requestWithdraw(address token, uint256 amount)
        external;

}
