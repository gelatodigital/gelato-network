const DxManagementService = require('./DxManagementService')
const getAuctionRepo = require('../../repositories/AuctionRepo')
const getEthereumRepo = require('../../repositories/EthereumRepo')

let instance, instancePromise

async function _getInstance () {
  const [auctionRepo, ethereumRepo] = await Promise.all([
    getAuctionRepo(),
    getEthereumRepo()
  ])
  return new DxManagementService({
    auctionRepo,
    ethereumRepo
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
