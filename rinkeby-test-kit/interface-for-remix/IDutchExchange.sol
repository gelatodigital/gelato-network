pragma solidity ^0.5.0;

interface IDutchExchange {
    function latestAuctionIndices(address sellToken, address buyToken) external view returns(uint256);

    function auctionStarts(address sellToken, address buyToken) external view returns(uint256);

    function clearingTimes(address sellToken, address buyToken, uint256 auctionIndex) external view returns(uint256);

    // Token => Token => auctionIndex => price
    function closingPrices(address sellToken, address buyToken, uint256 auctionIndex) external view returns(uint256);

    // Token => Token => amount
    function sellVolumesCurrent(address sellToken, address buyToken) external view returns(uint256);

    // Token => Token => amount
    function sellVolumesNext(address sellToken, address buyToken) external view returns(uint256);

    // Token => Token => amount
    function buyVolumes(address sellToken, address buyToken) external view returns(uint256);

    // Token => user => amount
    // balances stores a user's balance in the DutchX
    function balances(address token, address user) external view returns(uint256);

    // Token => Token =>  auctionIndex => user => amount
    function sellerBalances(address sellToken, address buyToken, uint256 auctionIndex, address user) external view returns(uint256);
    function buyerBalances(address sellToken, address buyToken, uint256 auctionIndex, address user) external view returns(uint256);
    function claimedAmounts(address sellToken, address buyToken, uint256 auctionIndex, address user) external view returns(uint256);
}