const loggerNamespace = 'dx-service:error'

process.on('uncaughtException', error => {
  logger.error({
    msg: 'Uncought exception: ' + error.toString(),
    error
  })

  // TODO: Decide if we want to shutdown the app here or not
  // _doShutDown(`There was a glonal unhandled exception`)
})
