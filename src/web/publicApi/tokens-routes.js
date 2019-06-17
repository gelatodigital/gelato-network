const addCacheHeader = require('../helpers/addCacheHeader')

function createRoutes ({ dxInfoService, reportService },
  { short: CACHE_TIMEOUT_SHORT,
    average: CACHE_TIMEOUT_AVERAGE,
    long: CACHE_TIMEOUT_LONG
  }) {
  const routes = []

  routes.push({
    path: '/',
    get (req, res) {
      const count = req.query.count !== undefined ? req.query.count : 20
      addCacheHeader({ res, time: CACHE_TIMEOUT_LONG })
      return dxInfoService.getTokenList({ count, approved: null })
    }
  })

  routes.push({
    path: '/whitelisted',
    get (req, res) {
      const count = req.query.count !== undefined ? req.query.count : 20
      addCacheHeader({ res, time: CACHE_TIMEOUT_LONG })
      return dxInfoService.getTokenList({ count, approved: true })
    }
  })

  return routes
}

module.exports = createRoutes
