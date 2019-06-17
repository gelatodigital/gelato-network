const debug = require('debug')('DEBUG-dx-service:repositories:PriceRepoIdex')
debug.log = console.debug.bind(console)

const httpRequest = require('../../../helpers/httpRequest')

class PriceRepoIdex {
  constructor ({
    url = 'https://api.idex.market',
    timeout = 5000
  }) {
    this._timeout = timeout
    this._baseUrl = url
  }

  async getPrice ({ tokenA, tokenB }) {
    const price = await this._getPrice({ tokenA, tokenB })

    if (price !== false) {
      return price
    } else {
      throw Error(
        'No matching markets in Idex: ' +
        tokenA + '-' + tokenB
      )
    }
  }

  async _getPrice ({ tokenA, tokenB }) {
    debug('Get price for %s-%s', tokenA, tokenB)
    const url = this._baseUrl + '/returnTicker'
    const isEthFirst = tokenA === 'ETH'

    const market = 'ETH_' + (isEthFirst ? tokenB : tokenA)

    const response = (await this._doPost(url, { market: market }))[market]

    if (response === undefined) {
      return false
    }

    // ETH_GEN in IDEX returns GEN/WETH value
    const lastPrice = isEthFirst ? 1 / response['last'] : response['last']

    debug('Idex Response to ' + market + ': ', lastPrice.toString())
    return lastPrice.toString()
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
}

module.exports = PriceRepoIdex
