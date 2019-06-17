const loggerNamespace = 'dx-service:ApiRunner'
const Logger = require('./helpers/Logger')
const logger = new Logger(loggerNamespace)

const getDxInfoService = require('./services/DxInfoService')

// Public Api
const getPublicApiServer = require('./web/publicApi/PublicApiServer')

class ApiRunner {
  constructor ({
    environment
  }) {
    this.initialized = false
    this._environment = environment
  }

  async init () {
    const [ dxInfoService, publicApiServer ] =
    await Promise.all([
      getDxInfoService(),
      getPublicApiServer()
    ])

    this._dxInfoService = dxInfoService
    this._publicApiServer = publicApiServer
    this.initialized = true
  }

  async start () {
    if (!this.initialized) {
      // Init bots and API Server
      await this.init()
    }
    const version = await this._dxInfoService.getVersion()
    await this._notifyStart(version)

    // Run Api server
    await this._publicApiServer.start()

    logger.info('Public API Server %s ready!', version)
  }

  async stop () {
    const version = await this._dxInfoService.getVersion()
    await this._notifyStop(version)

    // Stop the API Server
    if (this._publicApiServer) {
      this._publicApiServer.stop()
    }
    logger.info('Public API Server is ready to shut down')
  }

  async _notifyStart (version) {
    const message = `Starting Public API Server v${version} in \
"${this._environment}" environment`

    this._dxInfoService.notifySlack(message, logger)
  }

  async _notifyStop (version) {
    const message = `Stopping Public API Server v${version} in \
"${this._environment}" environment`

    this._dxInfoService.notifySlack(message, logger)
  }
}

module.exports = ApiRunner
