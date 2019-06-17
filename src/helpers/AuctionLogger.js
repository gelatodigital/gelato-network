const Logger = require('./Logger')

class AuctionLogger extends Logger {
  debug (options) {
    super._doLog('DEBUG', this._getLoggerParams(options))
  }

  info (options) {
    super._doLog('INFO', this._getLoggerParams(options))
  }

  warn (options) {
    super._doLog('WARN', this._getLoggerParams(options))
  }

  error (options) {
    super._doLog('ERROR', this._getLoggerParams(options))
  }

  _getLoggerParams (options) {
    const { sellToken, buyToken } = options
    const sufix = sellToken + '-' + buyToken

    const contextDataAux = options.contextData || {}
    const tags = [ sufix ].concat(options.tags || [])
    const extra = Object.assign({ sellToken, buyToken }, contextDataAux.extra)
    const contextData = Object.assign(contextDataAux, { extra, tags })

    const params = Object.assign(options, {
      sufix,
      contextData
    })
    delete params.sellToken
    delete params.buyToken

    return params
  }
}

module.exports = AuctionLogger
