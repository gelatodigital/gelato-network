const DxTradeService = require('./DxTradeService')
const conf = require('../../../conf')
const getAuctionRepo = require('../../repositories/AuctionRepo')
const getEthereumRepo = require('../../repositories/EthereumRepo')

let instance, instancePromise

async function _getInstance () {
  const [auctionRepo, ethereumRepo] = await Promise.all([
    getAuctionRepo(),
    getEthereumRepo()
  ])
  return new DxTradeService({
    auctionRepo,
    ethereumRepo,
    markets: conf.MARKETS
  })
}

module.exports = async () => {
  if (!instance) {
    if (!instancePromise) {
      instancePromise = _getInstance()
    }

    instance = await instancePromise
  }

  return instance
}
