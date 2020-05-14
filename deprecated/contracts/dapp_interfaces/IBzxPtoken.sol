pragma solidity ^0.6.8;

interface IBzxPtoken {

    // Margin Trading - pTokens

    // === State-Changing Functions ====
    // https://docs.bzx.network/fulcrum-integration/trading-borrowing#state-changing-functions


    /**
     * @notice Deposit assets to the pToken, which in turn creates pTokens
        to the lender’s wallet at the current tokenPrice() rate.
     * @dev Prior ERC20 depositToken.approve(pTokenContractAddr, depositAmount) needed
     * @param receiver address that will receive the created pTokens.
     * @param depositTokenAddress  Any supported KyberToken.  However, specifying
        a token other the asset returned by the loanTokenAddress() function will
        trigger a KyberSwap into the correct asset, being subject to any trade slippage
        that may occur.
     * @param depositAmount you can cap it at loanToken
     * @param maxPriceAllowed A slippage limit on the payout rate of the pTokens created.
        This should be set to a value above the current price returned by `tokenPrice()`.
        A value of 0 is ignored.  ** footnote 1
     */
    function createWithToken(
        address receiver,
        address depositTokenAddress,
        uint256 depositAmount,
        uint256 maxPriceAllowed
    )
        external
        returns (uint256);

    // function createWithEther() omitted because requires GelatoUserProxy to store ETH


    /**
    * @notice Called to redeem owned pTokens for an equivalent amount of the
    underlying asset based on remaining collateral, unpaid interest, and including
    any profits or losses on the position, at the current tokenPrice() rate.
    * @param receiver address that will receive the asset proceeds.
    * @param burnTokenAddress address of the asset receiver should get for pTokens burnt
    * @param burnAmount amount of pTokens to burn
    * @param minPriceAllowed Slippage limit - should be set to value below current price
       returnded by `tokenPrice()`. A value of 0 is ignored.
    */
    function burnToToken(
        address receiver,
        address burnTokenAddress,
        uint256 burnAmount,
        uint256 minPriceAllowed
    )
        external
        returns (uint256);

    /**
    * @notice Called to redeem owned pTokens for an equivalent amount of ETH
       based on remaining collateral, unpaid interest, and including
       any profits or losses on the position, at the current tokenPrice() rate.
    * @param receiver address that will receive the asset proceeds.
    * @param burnAmount amount of pTokens to burn
    * @param minPriceAllowed Slippage limit - should be set to value below current price
       returnded by `tokenPrice()`. A value of 0 is ignored.
    */
    function burnToEther(
        address payable receiver,
        uint256 burnAmount,
        uint256 minPriceAllowed
    )
        external
        returns (uint256);

    // === Read-Only Functions ====
    // https://docs.bzx.network/fulcrum-integration/trading-borrowing#read-only-functions

    /// @notice Returns the address of the token that will be leveraged
    /// @dev if the depositTokenAddress != loanTokenAddress of pToken, a Kyber Swap
    ///  is triggered to convert depositToken into loanToken => more gas costs than
    ///  if depositTokenAddress == loanTokenAddress.
    function loanTokenAddress() external view returns(address);

    /// @notice Returns the current price of the pToken.
    /// Example: 1000000000000000000000 = 1 ETH per pToken
    function tokenPrice() external view returns (uint256 price);

    /// @notice Returns price at which the underlying position should be liquidated
    ///  by the bZx protocol, or 0 if no position is open.
    function liquidationPrice() external view returns (uint256 price);


    /// @notice Returns the token price recorded during the last checkpoint for the user.
    ///  Checkpoints occur whenever there is a token balance changing action taken by
    ///   the user (submission, burning, or transferring).
    /// User profit since last checkpoint formula:
    ///  (tokenPrice() - checkpointPrice(user)) * balanceOf(user) / 10^36
    function checkpointPrice(address _user) external view returns (uint256 price);


    /// @notice marketLiquidityForLoan() will tell you the largest amount
    ///  you can deposit to create pTokens based on available liquidity in the lending pools
    function marketLiquidityForLoan() external view returns(uint256 maxDepositAmount);

    /// @notice Returns the owner's balance of the underlying asset.
    /// @dev Identical to: pToken.balanceOf(_owner) * tokenPrice()
    function assetBalanceOf(address _owner) external view returns (uint256);
}

/** Footnotes

depositA

maxPriceAllowed: maxPriceAllowed is to regulate the changes in tokenPrice() between
 when it's first queried off-chain, and when it's mined later. it doesn't really have
 relevance if you query it during a transaction, then submit the create

*/
