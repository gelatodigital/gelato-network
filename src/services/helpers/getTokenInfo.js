async function getTokenInfo ({
  auctionRepo,
  ethereumRepo,
  token,
  raiseErrorIfCantGetInfo = true
}) {
  const tokenAddress = await auctionRepo.getTokenAddress({ token })

  try {
    const info = await ethereumRepo.tokenGetInfo({ tokenAddress })
    return info
  } catch (error) {
    if (raiseErrorIfCantGetInfo) {
      throw error
    }

    return { address: tokenAddress }
  }
}

module.exports = getTokenInfo
