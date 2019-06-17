const conf = require('../../../conf')

let instance, instancePromise

async function _getInstance () {
  const {
    Factory: PriceRepo,
    factoryConf: priceRepoConf
  } = conf.getFactory('PRICE_REPO')

  return new PriceRepo(priceRepoConf)
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
