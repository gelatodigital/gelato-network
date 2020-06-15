// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;

/// @title IKyberNetworkProxy
/// @notice Interface to the KyberNetworkProxy contract.
///  The KyberNetworkProxy contract's role is to facilitate two main functionalities:
///  1) return the expected exchange rate, and 2) to execute a trade.
/// @dev https://developer.kyber.network/docs/API_ABI-KyberNetworkProxy/
interface IKyberNetworkProxy {
    /**
     * @dev Makes a trade between src and dest token and send dest tokens to destAddress
     * @param src source ERC20 token contract address
     * @param srcAmount source ERC20 token amount in its token decimals
     * @param dest destination ERC20 token contract address
     * @param destAddress recipient address for destination ERC20 token
     * @param maxDestAmount limit on the amount of destination tokens
     * @param minConversionRate minimum conversion rate; trade is canceled if actual rate is lower
     * @param walletId wallet address to send part of the fees to
     * @return Amount of actual destination tokens
     * @notice srcAmount | maxDestAmount These amounts should be in the source and
         destination token decimals respectively. For example, if the user wants to swap
         from / to 10 POWR,which has 6 decimals, it would be 10 * (10 ** 6) = 10000000
     * @notice maxDestAmount should not be 0. Set it to an arbitarily large amount
         if you want all source tokens to be converted.
     * @notice minConversionRate: This rate is independent of the source and
         destination token decimals. To calculate this rate, take yourRate * 10**18.
         For example, even though ZIL has 12 token decimals, if we want the minimum
         conversion rate to be 1 ZIL = 0.00017 ETH, then
         minConversionRate = 0.00017 * (10 ** 18).
     * @notice walletId: If you are part of our fee sharing program, this will be
         your registered wallet address. Set it as 0 if you are not a participant.
     * @notice Since ETH is not an ERC20 token, we use
        0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee as a proxy address to represent it.
     * @notice If src is ETH, then you also need to send ether along with your call.
     * @notice There is a minimum trading value of 1000 wei tokens.
        Anything fewer is considered as 0.
     */
    function trade(
        address src,
        uint256 srcAmount,
        address dest,
        address destAddress,
        uint256 maxDestAmount,
        uint256 minConversionRate,
        address walletId
    )
        external
        payable
        returns (uint256);

    /**
     * @dev Get the expected exchange rate.
     * @param src source ERC20 token contract address
     * @param dest destination ERC20 token contract address
     * @param srcQty wei amount of source ERC20 token
     * @return The expected exchange rate and slippage rate.
     * @notice Returned values are in precision values (10**18)
        To understand what this rate means, divide the obtained value by 10**18
        (tA, tB,)
     */
    function getExpectedRate(address src, address dest, uint256 srcQty)
        external
        view
        returns (uint256, uint256);
}
