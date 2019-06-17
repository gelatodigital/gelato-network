// const loggerNamespace = 'dx-service:services:DxManagementService'
// const Logger = require('../../helpers/Logger')
// const logger = new Logger(loggerNamespace)
const assert = require('assert')

class DxManagementService {
  constructor ({
    auctionRepo,
    ethereumRepo
  }) {
    assert(auctionRepo, '"auctionRepo" is required')
    assert(ethereumRepo, '"ethereumRepo" is required')

    this._auctionRepo = auctionRepo
    this._ethereumRepo = ethereumRepo
  }

  async approveToken ({ token, from }) {
    return this._auctionRepo.approveToken({ token, from })
  }

  async addTokenPair ({ from, tokenA, tokenAFunding, tokenB, tokenBFunding, initialClosingPrice }) {
    const [ tokenAInfo, tokenBInfo ] = await Promise.all([
      this._ethereumRepo.tokenGetInfo({ tokenAddress: tokenA }),
      this._ethereumRepo.tokenGetInfo({ tokenAddress: tokenB })
    ])
    tokenA = tokenAInfo.symbol === 'WETH' ? tokenAInfo.symbol : tokenA
    tokenB = tokenBInfo.symbol === 'WETH' ? tokenBInfo.symbol : tokenB
    return this._auctionRepo.addTokenPair({
      from,
      tokenA,
      tokenAFunding,
      tokenB,
      tokenBFunding,
      initialClosingPrice
    })
  }
}

module.exports = DxManagementService
