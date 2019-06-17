const DxInfoService = require('./DxInfoService')
const conf = require('../../../conf')
const getAuctionRepo = require('../../repositories/AuctionRepo')
const getDxPriceOracleRepo = require('../../repositories/DxPriceOracleRepo')
const getEthereumRepo = require('../../repositories/EthereumRepo')
const getSlackRepo = require('../../repositories/SlackRepo')

let instance, instancePromise

async function _getInstance () {
  const [auctionRepo, dxPriceOracleRepo, ethereumRepo, slackRepo] = await Promise.all([
    getAuctionRepo(),
    getDxPriceOracleRepo(),
    getEthereumRepo(),
    getSlackRepo()
  ])
  return new DxInfoService({
    auctionRepo,
    dxPriceOracleRepo,
    ethereumRepo,
    slackRepo,
    markets: conf.MARKETS,
    operationsSlackChannel: conf.SLACK_CHANNEL_OPERATIONS
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
