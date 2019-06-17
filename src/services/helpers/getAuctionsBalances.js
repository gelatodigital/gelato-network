async function getAuctionsBalances ({ auctionRepo, tokenA, tokenB, address, count }) {
  const auctionIndex = await auctionRepo.getAuctionIndex({
    sellToken: tokenA,
    buyToken: tokenB
  })

  const balancesPromises = []
  const startAuctionIndex = (auctionIndex - count) >= 0 ? auctionIndex - count + 1 : 0
  for (var i = startAuctionIndex; i <= auctionIndex; i++) {
    const auctionIndexAux = i
    const balancePromise = Promise.all([
      auctionRepo.getSellerBalance({
        sellToken: tokenA,
        buyToken: tokenB,
        auctionIndex: auctionIndexAux,
        address
      }),
      auctionRepo.getSellerBalance({
        sellToken: tokenB,
        buyToken: tokenA,
        auctionIndex: auctionIndexAux,
        address
      }),
      auctionRepo.getBuyerBalance({
        sellToken: tokenA,
        buyToken: tokenB,
        auctionIndex: auctionIndexAux,
        address
      }),
      auctionRepo.getBuyerBalance({
        sellToken: tokenB,
        buyToken: tokenA,
        auctionIndex: auctionIndexAux,
        address
      })
    ]).then(([
      sellerBalanceA,
      sellerBalanceB,
      buyerBalanceA,
      buyerBalanceB
    ]) => ({
      auctionIndex: auctionIndexAux,
      sellerBalanceA,
      sellerBalanceB,
      buyerBalanceA,
      buyerBalanceB
    }))

    balancesPromises.push(balancePromise)
  }

  return Promise
    .all(balancesPromises)
    .then(balances => balances.reverse())
}

module.exports = getAuctionsBalances
