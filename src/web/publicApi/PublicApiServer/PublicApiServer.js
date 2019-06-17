const express = require('express')
const path = require('path')

// const info = require('debug')('INFO-dx-service:PublicApiServer')
const Server = require('../../helpers/Server')
const createRouter = require('../../helpers/createRouter')

class PublicApiServer extends Server {
  constructor ({ port = 8080, host, dxInfoService, dxTradeService, auctionService, cacheTimeouts }) {
    super({ port, host })
    this._dxInfoService = dxInfoService
    this._dxTradeService = dxTradeService
    this._auctionService = auctionService
    this._cacheTimeouts = cacheTimeouts
  }

  async _registerRoutes ({ app, contextPath }) {
    const services = {
      dxInfoService: this._dxInfoService,
      dxTradeService: this._dxTradeService,
      auctionService: this._auctionService
    }

    // Redirect www to non-www
    app.get('/*', function (req, res, next) {
      req.headers.host.match(/^www/) !== null
        ? res.redirect('https://' + req.headers.host.replace(/^www\./, '') + req.url, 301)
        : next()
    })

    // Get routes
    const mainRoutes = require('../main-routes')(services, this._cacheTimeouts)
    const testRoutes = require('../test-routes')(services)
    const tokensRoutes = require('../tokens-routes')(services, this._cacheTimeouts)
    const marketsRoutes = require('../markets-routes')(services, this._cacheTimeouts)
    const auctionsRoutes = require('../auctions-routes')(services, this._cacheTimeouts)
    const accountsRoutes = require('../accounts-routes')(services, this._cacheTimeouts)
    const uiRoutes = require('../ui-routes')(services, this._cacheTimeouts)

    // Static content
    const landingPage = express.Router()
    landingPage.use(contextPath, express.static(path.join(__dirname, '../static/landing')))
    app.use('/', landingPage)

    const mainPages = express.Router()
    mainPages.use(contextPath, express.static(path.join(__dirname, '../static')))
    app.use('/api', mainPages)

    // Main routes
    app.use('/api', createRouter(mainRoutes))
    app.use('/api/test', createRouter(testRoutes))

    // Tokens routes
    app.use('/api/v1/tokens', createRouter(tokensRoutes))
    // Markets routes
    app.use('/api/v1/markets', createRouter(marketsRoutes))
    // Auctions routes
    app.use('/api/v1/auctions', createRouter(auctionsRoutes))
    // Accounts routes
    app.use('/api/v1/accounts', createRouter(accountsRoutes))
    // UI routes
    app.use('/api/v1/ui', createRouter(uiRoutes))
    app.use(contextPath + '/api', express.static(path.join(__dirname, '../static')))
  }
  async _getServiceName () {
    const version = await this._dxInfoService.getVersion()
    return 'DutchX-API-v' + version
  }
}

module.exports = PublicApiServer
