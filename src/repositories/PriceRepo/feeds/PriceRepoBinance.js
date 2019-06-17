const debug = require('debug')('DEBUG-dx-service:repositories:PriceRepoBinance')
debug.log = console.debug.bind(console)

const httpRequest = require('../../../helpers/httpRequest')
const Cache = require('../../../helpers/Cache')
const CACHE_SYMBOLS_KEY = 'PriceRepoBinance:'
const CACHE_SYMBOLS_TIME = 2 * 60 * 60 // 2 hours

class PriceRepoBinance {
  constructor ({ url = 'https://api.binance.com/api', version = 'v1', timeout = 5000 }) {
    this._timeout = timeout
    this._version = version
    this._baseUrl = url
    this._cache = new Cache('PriceRepoBinance')
  }

  // Get Binance market pairs
  async getSymbols () {
    debug('Get symbols')
    return this._cache.get({
      key: CACHE_SYMBOLS_KEY,
      time: CACHE_SYMBOLS_TIME,
      fetchFn: () => {
        return this._getSymbols()
      }
    })
  }

  async _getSymbols () {
    const url = this._baseUrl + '/' + this._version + '/exchangeInfo'
    debug('Binance request symbols url: ', url)

    const request = { url, method: 'GET', data: {}, timeout: this._timeout }
    const response = await httpRequest.rawRequest(request, {})

    return response.symbols
  }

  async getPrice ({ tokenA, tokenB }) {
    const pairABExist = await this._existTokenPair({ tokenA, tokenB })

    if (pairABExist) {
      return this._getPrice({ tokenA, tokenB })
    } else {
      const [ pairAEthExist, pairBEthExist ] = await Promise.all([
        this._existTokenPair({ tokenA, tokenB: 'ETH' }),
        this._existTokenPair({ tokenA: tokenB, tokenB: 'ETH' })
      ])

      if (pairAEthExist && pairBEthExist) {
        const [ tokenAEth, tokenBEth ] = await Promise.all([
          this._getPrice({ tokenA, tokenB: 'ETH' }),
          this._getPrice({ tokenA: tokenB, tokenB: 'ETH' })
        ])

        return tokenAEth / tokenBEth
      } else {
        throw Error('No matching markets in Binance: ' + tokenA + '-' + tokenB +
        '. tokenA-ETH exist: ' + pairAEthExist + ' tokenB-ETH exist: ' + pairBEthExist)
      }
    }
  }

  async _getPrice ({ tokenA, tokenB }) {
    debug('Get price for %s-%s', tokenA, tokenB)

    let invertTokens = await this._isTokenOrderInverted({ tokenA, tokenB })
    let tokenSymbol
    invertTokens ? tokenSymbol = tokenB + tokenA
      : tokenSymbol = tokenA + tokenB
    tokenSymbol = tokenSymbol.toUpperCase()

    const url = this._baseUrl + '/v3/ticker/price?symbol=' + tokenSymbol
    debug('Binance request price url: ', url)
    const request = { url, method: 'GET', data: {}, timeout: this._timeout }

    const response = await httpRequest.rawRequest(request, {})
    let closePrice = response.price
    if (invertTokens) {
      closePrice = (1 / closePrice)
    }

    debug('Binance Response to ' + tokenSymbol + ': ', closePrice.toString())
    return closePrice.toString()
  }

  // get Matching Pairs abstraction to reuse code
  async _getMatchingPairs ({ tokenA, tokenB }) {
    const tokenALower = tokenA.toUpperCase()
    const tokenBLower = tokenB.toUpperCase()

    const symbols = await this.getSymbols()

    return symbols.filter(pair => {
      const baseAsset = pair['baseAsset']
      const quoteAsset = pair['quoteAsset']
      return (
        baseAsset === tokenALower ||
        quoteAsset === tokenALower
      ) && (
        baseAsset === tokenBLower ||
        quoteAsset === tokenBLower)
    })
  }

  // Check if a token pair exists
  async _existTokenPair ({ tokenA, tokenB }) {
    let matchingPairs = await this._getMatchingPairs({ tokenA, tokenB })

    return matchingPairs.length > 0
  }

  // Check token order to get pair info from Binance
  async _isTokenOrderInverted ({ tokenA, tokenB }) {
    debug('Check token order for %s-%s', tokenA, tokenB)
    const tokenALower = tokenA.toUpperCase()
    const tokenBLower = tokenB.toUpperCase()

    let matchingPairs = await this._getMatchingPairs({ tokenA, tokenB })

    if (matchingPairs.length === 0) {
      throw Error('No matching markets in Binance: ' + tokenA + '-' + tokenB)
    }

    debug('Pair order result: %s', matchingPairs)
    const [ pair ] = matchingPairs
    return tokenALower === pair['quoteAsset'] &&
    tokenBLower === pair['baseAsset']
  }
}

module.exports = PriceRepoBinance
