const Logger = require('../Logger')
const logger = new Logger('dx-service:web3Providers')

// const Logger = require('./helpers/Logger')
// const logger = new Logger('dx-service:web3Providers')

// We handle this error separatelly, because node throw this error from time to
// time, and it disapears after some seconds
const NODE_ERROR_EMPTY_RESPONSE = 'Error: Invalid JSON RPC response: ""'
const SILENT_TIME_FOR_NODE_ERRORS = 120000 // 120s

/**
 * Handles NodeJS errors
 * @param {Object} error
 */
function _printProviderError (error) {
  const errorMessage = error.message
  let debugLevel; let reduceWarnLevelForNodeErrors = false
  if (errorMessage === NODE_ERROR_EMPTY_RESPONSE) {
    if (reduceWarnLevelForNodeErrors) {
      debugLevel = 'warn'
    } else {
      debugLevel = 'error'
      reduceWarnLevelForNodeErrors = true
      setTimeout(() => {
        reduceWarnLevelForNodeErrors = false
      }, SILENT_TIME_FOR_NODE_ERRORS)
    }
  } else {
    debugLevel = 'error'
  }
  logger[debugLevel]({
    msg: 'Error in Ethereum node %s: %s',
    params: [this._url, error.message]
    // error // We hide the stack trace, is not usefull in this case (dispached by web3 internals)
  })
}

module.exports = _printProviderError
