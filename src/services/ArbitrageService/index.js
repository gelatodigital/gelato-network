const ArbitrageService = require('./ArbitrageService')
const conf = require('../../../conf')
const getArbitrageRepo = require('../../repositories/ArbitrageRepo')
const getAuctionRepo = require('../../repositories/AuctionRepo')
const getEthereumRepo = require('../../repositories/EthereumRepo')

let instance, instancePromise
async function _getInstance () {
  const [arbitrageRepo, auctionRepo, ethereumRepo] = await Promise.all([
    getArbitrageRepo(),
    getAuctionRepo(),
    getEthereumRepo()
  ])
  return new ArbitrageService({
    arbitrageRepo,
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
