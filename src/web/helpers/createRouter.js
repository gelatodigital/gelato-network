const express = require('express')
const requestHandlerWrapper = require('./requestHandlerWrapper')

const REST_METHODS = ['get', 'post', 'put', 'delete']

function createRouter (routes) {
  const router = express.Router()

  routes.forEach(route => {
    const routesDefinitions = REST_METHODS
      .map(restMethod => ({
        restMethod,
        handler: route[restMethod]
      }))
      .filter(routeDefinition => routeDefinition.handler !== undefined)
      .map(routeDefinition => ({
        restMethod: routeDefinition.restMethod,
        handler: requestHandlerWrapper(routeDefinition.handler)
      }))

    const routerRoute = router.route(route.path)
    routesDefinitions.forEach(routeDefinition => {
      routerRoute[routeDefinition.restMethod](routeDefinition.handler)
    })
  })

  return router
}

module.exports = createRouter
