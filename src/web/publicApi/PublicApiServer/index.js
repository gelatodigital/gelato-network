const PublicApiServer = require('./PublicApiServer')
const conf = require('../../../../conf')
const getDxInfoService = require('../../../services/DxInfoService')
const getDxTradeService = require('../../../services/DxTradeService')
const getAuctionService = require('../../../services/AuctionService')

let publicApiServer
module.exports = async () => {
  if (!publicApiServer) {
    const [ dxInfoService, dxTradeService, auctionService ] = await Promise.all([
      getDxInfoService(),
      getDxTradeService(),
      getAuctionService()
    ])
    publicApiServer = new PublicApiServer({
      port: conf.PUBLIC_API_PORT,
      host: conf.PUBLIC_API_HOST,
      dxInfoService,
      dxTradeService,
      auctionService,
      cacheTimeouts: conf.CACHE
    })
  }

  return publicApiServer
}
