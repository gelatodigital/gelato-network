const conf = require('../../../conf')
const getWeb3 = require('../web3')
const EthereumClient = require('./EthereumClient')

let instance, instancePromise

async function _getInstance () {
  const {
    NETWORK,
    CACHE,
    URL_GAS_PRICE_FEED_GAS_STATION,
    URL_GAS_PRICE_FEED_SAFE
  } = conf

  // Get instance of web3 by
  const web3 = await getWeb3()

  instance = new EthereumClient({
    web3,
    network: NETWORK,
    cacheConf: CACHE,
    urlPriceFeedGasStation: URL_GAS_PRICE_FEED_GAS_STATION,
    urlPriceFeedSafe: URL_GAS_PRICE_FEED_SAFE
  })

  await instance.start()

  return instance
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
