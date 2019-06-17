// const loggerNamespace = 'dx-service:services:ExternalFeedsService'
// const Logger = require('../helpers/Logger')
// const logger = new Logger(loggerNamespace)
const assert = require('assert')

class MarketService {
  constructor ({
    priceRepo
  }) {
    assert(priceRepo, '"priceRepo" is required')

    this._priceRepo = priceRepo
  }

  async getPrice ({ tokenA, tokenB }) {
    return this._priceRepo.getPrice({ tokenA, tokenB })
  }
}

module.exports = MarketService
