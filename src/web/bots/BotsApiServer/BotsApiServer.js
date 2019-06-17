// const info = require('debug')('INFO-dx-service:BotsApiServer')
const Server = require('../../helpers/Server')
const createRouter = require('../../helpers/createRouter')

const express = require('express')
const path = require('path')

class BotsApiServer extends Server {
  constructor ({ port = 8081, host, botsService, reportService, ethereumClient, config }) {
    super({ port, host })
    this._botsService = botsService
    this._reportService = reportService
    this._ethereumClient = ethereumClient
    this._config = config
  }

  async _registerRoutes ({ app, contextPath }) {
    const services = {
      botsService: this._botsService,
      reportService: this._reportService
    }

    // Static content
    const mainPages = express.Router()
    mainPages.use(contextPath, express.static(path.join(__dirname, '../static')))
    app.use('', mainPages)

    // Get routes
    const mainRoutes = require('../main-routes')(services)
    const reportsRoutes = require('../reports-routes')(services, this._ethereumClient, this._config)

    // Main routes
    app.use('/api', createRouter(mainRoutes))

    app.use('/api/v1/reports', createRouter(reportsRoutes))
  }

  async _getServiceName () {
    const version = await this._botsService.getVersion()
    return 'Bots-API-v' + version
  }
}

module.exports = BotsApiServer
