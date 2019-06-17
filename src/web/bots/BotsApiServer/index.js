const BotsApiServer = require('./BotsApiServer')
const conf = require('../../../../conf')
const getBotsService = require('../../../services/BotsService')
const getReportService = require('../../../services/ReportService')
const getEthereumClient = require('../../../helpers/ethereumClient')

let botApiServer
module.exports = async () => {
  if (!botApiServer) {
    const [botsService, reportService, ethereumClient] = await Promise.all([
      getBotsService(),
      getReportService(),
      getEthereumClient()
    ])
    botApiServer = new BotsApiServer({
      port: conf.BOTS_API_PORT,
      host: conf.BOTS_API_HOST,
      botsService,
      reportService,
      ethereumClient,
      config: conf
    })
  }

  return botApiServer
}
