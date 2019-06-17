const debug = require('debug')('DEBUG-dx-service:repositories:PriceRepoMock')
debug.log = console.debug.bind(console)

const pricesInUSD = require('../../../tests/data/auctions').pricesInUSD

class PriceRepoMock {
  constructor () {
    // RDN/WETH: 0.004079
    //  So 1 WETH = 243.891605 RDN
    //  https://walletinvestor.com/converter/usd/ethereum/290
    this._priceTable = {}

    // this._changePriceRandomly()
  }

  async getPrice ({ tokenA, tokenB }) {
    debug('Get price for %s-%s', tokenA, tokenB)
    const priceUSDxA =
      pricesInUSD.find(priceInUSD => priceInUSD.token === tokenA)

    let priceBxA
    if (tokenB === 'USD') {
      priceBxA = priceUSDxA.price
    } else {
      const priceUSDxB =
        pricesInUSD.find(priceInUSD => priceInUSD.token === tokenB)

      priceBxA = priceUSDxA.price / priceUSDxB.price
    }

    debug('Get price: %d %s/%s', priceBxA, tokenB, tokenA)
    return priceBxA
  }

  _changePriceRandomly () {
    // Changes the price every 5 seconds in the range [-10%, +10%]
    setTimeout(() => {
      pricesInUSD.forEach(priceInUSD => {
        const percentageDifference = Math.floor(10 * Math.random())
        const sign = Math.random() < 0.5 ? -1 : 1

        priceInUSD.price = priceInUSD.price +
          sign * (percentageDifference * priceInUSD.price / 100)
        debug(
          'New price for %s-USD pair (%s%s%): %d',
          priceInUSD.token,
          (sign === -1 ? '-' : '+'),
          percentageDifference,
          priceInUSD.price
        )
      })
    }, 1500)
  }
}

module.exports = PriceRepoMock
