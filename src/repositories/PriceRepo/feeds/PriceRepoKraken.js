const debug = require('debug')('DEBUG-dx-service:repositories:PriceRepoKraken')
debug.log = console.debug.bind(console)

const httpRequest = require('../../../helpers/httpRequest')
const Cache = require('../../../helpers/Cache')
const CACHE_SYMBOLS_KEY = 'PriceRepoKraken:'
const CACHE_SYMBOLS_TIME = 2 * 60 * 60 // 2 hours
const LAST_OPERATION_PROP_NAME = 'c'

class PriceRepoKraken {
  constructor ({ url = 'https://api.kraken.com', version = 0, timeout = 5000 }) {
    this._timeout = timeout
    this._baseUrl = url + '/' + version
    this._cache = new Cache('PriceRepoKraken')
  }

  // Get Kraken market pairs
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
    const url = this._baseUrl + '/public/AssetPairs'
    debug('Kraken request symbols url: ', url)

    const request = { url, method: 'GET', data: {}, timeout: this._timeout }
    const response = await httpRequest.rawRequest(request, {})

    return response.result
  }

  async getPrice ({ tokenA, tokenB }) {
    const pairABExist = await this._existTokenPair({ tokenA, tokenB })
    debug('Token pair exists in repo:', pairABExist)

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
        throw Error('No matching markets in Kraken: ' + tokenA + '-' + tokenB +
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

    const url = this._baseUrl + '/public/Ticker'
    debug('Kraken request price url: %s', url)
    const response = await this
      ._doPost(url, {
        pair: tokenSymbol
      })
      .then(krakenResponse => {
        const firstPair = getFirstPair(krakenResponse.result)
        const operation = getOperation(firstPair)

        return operation.price
      })

    let closePrice = response
    if (invertTokens) {
      closePrice = (1 / closePrice)
    }

    debug('Kraken response to ' + tokenSymbol + ': ', closePrice.toString())
    return closePrice.toString()
  }

  async _doPost (url, data) {
    const request = {
      url,
      method: 'POST',
      data,
      timeout: this._timeout
    }
    debug('request: %o', request)

    return httpRequest
      .rawRequest(request, {})
  }

  // get Matching Pairs abstraction to reuse code
  async _getMatchingPairs ({ tokenA, tokenB }) {
    const tokenALower = tokenA.toUpperCase()
    const tokenBLower = tokenB.toUpperCase()

    const symbols = await this.getSymbols()

    let matchingPairs = []

    if (symbols[tokenALower + tokenBLower] !== undefined) {
      matchingPairs.push(tokenALower + tokenBLower)
    }
    if (symbols[tokenBLower + tokenALower] !== undefined) {
      matchingPairs.push(tokenBLower + tokenALower)
    }

    return matchingPairs
  }

  // Check if a token pair exists
  async _existTokenPair ({ tokenA, tokenB }) {
    let matchingPairs = await this._getMatchingPairs({ tokenA, tokenB })

    debug('Matching pairs: ', matchingPairs)

    return matchingPairs.length > 0
  }

  // Check token order to get pair info from Kraken
  async _isTokenOrderInverted ({ tokenA, tokenB }) {
    debug('Check token order for %s-%s', tokenA, tokenB)
    const tokenALower = tokenA.toUpperCase()
    const tokenBLower = tokenB.toUpperCase()

    let matchingPairs = await this._getMatchingPairs({ tokenA, tokenB })

    if (matchingPairs.length === 0) {
      throw Error('No matching markets in Kraken: ' + tokenA + '-' + tokenB)
    }

    debug('Pair order result: %s', matchingPairs)
    const [ pair ] = matchingPairs
    return (tokenBLower + tokenALower) === pair
  }
}

function getFirstPair (krakenResult) {
  const firstProp = Object.keys(krakenResult)[0]
  return krakenResult[firstProp]
}

function getOperation (pair) {
  const [ price, amount ] = pair[LAST_OPERATION_PROP_NAME]
  return { price, amount }
}

module.exports = PriceRepoKraken
