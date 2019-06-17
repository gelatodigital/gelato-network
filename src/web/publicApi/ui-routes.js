const addCacheHeader = require('../helpers/addCacheHeader')

function createRoutes ({ dxInfoService },
  { short: CACHE_TIMEOUT_SHORT,
    average: CACHE_TIMEOUT_AVERAGE,
    long: CACHE_TIMEOUT_LONG
  }) {
  const routes = []

  routes.push({
    path: '/token-pairs',
    get (req, res) {
      const count = req.query.count !== undefined ? req.query.count : 10
      addCacheHeader({ res, time: CACHE_TIMEOUT_LONG })
      return dxInfoService.getMarkets({ count })
    }
  })

  routes.push({
    path: '/tokens',
    get (req, res) {
      const count = req.query.count !== undefined ? req.query.count : 20
      addCacheHeader({ res, time: CACHE_TIMEOUT_LONG })
      return dxInfoService.getConfiguredTokenList({ count })
    }
  })

  return routes
}

module.exports = createRoutes
