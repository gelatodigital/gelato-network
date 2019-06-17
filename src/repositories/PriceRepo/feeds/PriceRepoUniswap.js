const debug = require('debug')('DEBUG-dx-service:repositories:PriceRepoUniswap')
debug.log = console.debug.bind(console)

const getArbitrageRepo = require('../../ArbitrageRepo')

const Cache = require('../../../helpers/Cache')
const CACHE_SYMBOLS_KEY = 'PriceRepoBinance:'
const CACHE_SYMBOLS_TIME = 2 * 60 * 60 // 2 hours

class PriceRepoUniswap {
  constructor ({
    // url = 'https://api.binance.com/api', version = 'v1', timeout = 5000
  }) {
    // this._timeout = timeout
    // this._version = version
    // this._baseUrl = url
    // this._cache = new Cache('PriceRepoBinance')
  }

  async _doInit () {
    if (!this._arbitrageRepo) {
      debug('Init arbitrage repo')
      this._arbitrageRepo = await getArbitrageRepo()
    }
  }

  async getPrice ({ tokenA, tokenB }) {
    await this._doInit()

    const sellToken = tokenA === 'ETH' ? 'WETH' : tokenA
    const buyToken = tokenB === 'ETH' ? 'WETH' : tokenB

    return this._arbitrageRepo.getUniswapBalances({ sellToken, buyToken })
      .then(({ inputBalance, outputBalance }) => {
        return outputBalance.div(inputBalance).toString()
      })
  }
}

module.exports = PriceRepoUniswap
