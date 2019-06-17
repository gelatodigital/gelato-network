const assert = require('assert')
const { formatPriceWithDecimals } = require('../../helpers/formatUtil')
const { TEN } = require('../../helpers/numberUtil')

async function getOutstandingVolume ({
  auctionRepo,
  ethereumRepo,
  sellToken,
  buyToken,
  auctionIndex
}) {
  const state = await auctionRepo.getState({ sellToken, buyToken, auctionIndex })
  assert(
    state !== 'WAITING_FOR_FUNDING' &&
    state !== 'WAITING_FOR_AUCTION_TO_START',
    `The auction can't be in a waiting period for getting the outstanding \
volume: ${state}`)

  const [
    sellVolume,
    buyVolume,
    price,
    sellTokenAddress,
    buyTokenAddress
  ] = await Promise.all([
    auctionRepo.getSellVolume({
      sellToken, buyToken }),
    auctionRepo.getBuyVolume({
      sellToken, buyToken }),
    auctionRepo.getCurrentAuctionPrice({
      sellToken, buyToken, auctionIndex }),
    auctionRepo.getTokenAddress({ token: sellToken }),
    auctionRepo.getTokenAddress({ token: buyToken })
  ])

  const [
    sellTokenInfo,
    buyTokenInfo
  ] = await Promise.all([
    ethereumRepo.tokenGetInfo({ tokenAddress: sellTokenAddress }),
    ethereumRepo.tokenGetInfo({ tokenAddress: buyTokenAddress })
  ])

  const priceWithDecimals = formatPriceWithDecimals({
    price, tokenADecimals: sellTokenInfo.decimals, tokenBDecimals: buyTokenInfo.decimals
  })

  const sellVolumeInBuyTokens = sellVolume
    .mul(TEN.toPower(buyTokenInfo.decimals - sellTokenInfo.decimals))
    .mul(priceWithDecimals.numerator)
    .div(priceWithDecimals.denominator)

  const outstandingVolume = sellVolumeInBuyTokens.minus(buyVolume)
  return outstandingVolume.lessThan(0) ? 0 : outstandingVolume
}

module.exports = getOutstandingVolume
