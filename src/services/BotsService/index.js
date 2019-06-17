const BotsService = require('./BotsService')
const conf = require('../../../conf')
const getAuctionRepo = require('../../repositories/AuctionRepo')
const getEthereumRepo = require('../../repositories/EthereumRepo')

let instance, instancePromise

async function _getInstance () {
  const [auctionRepo, ethereumRepo] = await Promise.all([
    getAuctionRepo(),
    getEthereumRepo()
  ])

  return new BotsService({
    auctionRepo,
    ethereumRepo,
    markets: conf.MARKETS,
    safes: conf.SAFES
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
