const loggerNamespace = 'dx-service:helpers:gracefullShutdown'
const Logger = require('./Logger')
const logger = new Logger(loggerNamespace)
const POSIX_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGQUIT']
const listeners = []
let shuttedDown = false

require('./globalErrorHandler')

POSIX_SIGNALS.forEach(signal => {
  process.on(signal, () => {
    _doShutDown(`I've gotten a ${signal} signal`)
  })
})

function onShutdown (listener) {
  // debug('Registering a new listener')
  listeners.push(listener)
}

async function shutDown (reason) {
  if (!shuttedDown) {
    shuttedDown = true
    let reasonPrefix = reason ? reason + ': ' : ''
    logger.debug(reasonPrefix + 'Closing gracefully...')

    // Wait for all shutdow listeners
    await Promise.all(
      listeners.map(listener => {
        return listener()
      })
    )
  }
}

function _doShutDown (reason) {
  function _doExit (returnCode) {
    logger.debug('The app is ready to shutdown! Good bye! :)')
    process.exit(returnCode)
  }

  shutDown(reason)
    .then(() => {
      _doExit(0)
    })
    .catch(error => {
      logger.error({
        msg: 'Error shuttting down the app: ' + error.toString(),
        error
      })
      _doExit(2)
    })
}

module.exports = {
  shutDown,
  onShutdown
}
