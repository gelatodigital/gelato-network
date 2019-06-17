async function getClaimableTokens ({
  auctionRepo,
  tokenA,
  tokenB,
  address,
  lastNAuctions
}) {
  let [
    sellerClaims,
    buyerClaims,
    marketDetails
  ] = await Promise.all([
    auctionRepo.getIndicesWithClaimableTokensForSellers({
      sellToken: tokenA, buyToken: tokenB, address, lastNAuctions
    }),

    auctionRepo.getIndicesWithClaimableTokensForBuyers({
      sellToken: tokenA, buyToken: tokenB, address, lastNAuctions
    }),

    auctionRepo.getStateInfo({
      sellToken: tokenA, buyToken: tokenB
    })
  ])

  function _filterUnfinishedAuctions (claims) {
    const [claimsIndices, claimsAmounts] = claims

    return claimsIndices.reduce((acc, auctionIndex, currentIndex) => {
      if (marketDetails.auction.isClosed ||
        marketDetails.auction.isTheoreticalClosed ||
        !auctionIndex.eq(marketDetails.auctionIndex)) {
        acc.push({
          auctionIndex,
          amount: claimsAmounts[currentIndex]
        })
      }
      return acc
    }, [])
  }

  sellerClaims = _filterUnfinishedAuctions(sellerClaims)
  buyerClaims = _filterUnfinishedAuctions(buyerClaims)

  return {
    sellerClaims,
    buyerClaims
  }
}

module.exports = getClaimableTokens
