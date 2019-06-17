// const debug = require('debug')('DEBUG-dx-services:web:api')

function createRoutes ({ botsService }) {
  const routes = []

  routes.push({
    path: [ '/', '/version' ],
    get (req, res) {
      return botsService.getVersion()
    }
  })

  routes.push({
    path: '/v1/ping',
    get (req, res) {
      res.status(204).send()
    }
  })

  routes.push({
    path: '/v1/health',
    get (req, res) {
      return botsService.getHealthEthereum()
    }
  })

  routes.push({
    path: '/about',
    get (req, res) {
      return botsService.getAbout()
    }
  })

  routes.push({
    path: '/v1/bots',
    get (req, res) {
      return botsService.getBots()
    }
  })

  routes.push({
    path: '/v1/safes',
    get (req, res) {
      return botsService.getSafes()
    }
  })

  return routes
}

module.exports = createRoutes
