const MarketService = require('./MarketService')
const getPriceRepo = require('../../repositories/PriceRepo')

let instance, instancePromise

async function _getInstance () {
  const priceRepo = await getPriceRepo()
  return new MarketService({
    priceRepo
  })
}

module.exports = async () => {
  if (!instance) {
    if (!instancePromise) {
      instancePromise = _getInstance()
    }

    instance = await instancePromise
  }

  return instance
}
