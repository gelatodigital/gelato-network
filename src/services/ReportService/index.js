const ReportService = require('./ReportService')
const conf = require('../../../conf')
const getAuctionRepo = require('../../repositories/AuctionRepo')
const getEthereumRepo = require('../../repositories/EthereumRepo')
const getSlackRepo = require('../../repositories/SlackRepo')

let instance, instancePromise

async function _getInstance () {
  const [auctionRepo, ethereumRepo, slackRepo] = await Promise.all([
    getAuctionRepo(),
    getEthereumRepo(),
    getSlackRepo()
  ])
  return new ReportService({
    auctionRepo,
    ethereumRepo,
    slackRepo,
    markets: conf.MARKETS,
    auctionsReportSlackChannel: conf.SLACK_CHANNEL_AUCTIONS_REPORT
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
