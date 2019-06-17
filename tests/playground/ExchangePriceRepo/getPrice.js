const PriceRepoImpl = require('../../../src/repositories/PriceRepo/PriceRepoImpl')
const formatUtil = require('../../../src/helpers/formatUtil.js')
const numberUtil = require('../../../src/helpers/numberUtil.js')

const EXCHANGE_PRICE_FEED_STRATEGIES_DEFAULT = {
  strategy: 'sequence', // TODO: More strategies can be implemented. i.e. averages, median, ponderated volumes, ...
  feeds: ['binance', 'huobi', 'kraken', 'bitfinex', 'hitbtc', 'liquid', 'idex', 'uniswap']
}

const EXCHANGE_PRICE_FEED_STRATEGIES = {
  'WETH-OMG': {
    strategy: 'sequence',
    feeds: ['binance', 'huobi', 'bitfinex']
  },
  'WETH-RDN': {
    strategy: 'sequence',
    feeds: ['huobi', 'binance', 'bitfinex']
  },
  'WETH-GEN': {
    strategy: 'sequence',
    feeds: ['idex', 'liquid']
  },
  'WETH-MKR': {
    strategy: 'sequence',
    feeds: ['binance']
  },
  'WETH-DAI': {
    strategy: 'sequence',
    feeds: ['binance']
  },
  'WETH-GNO': {
    strategy: 'sequence',
    feeds: ['kraken']
  }
}

const PRICE_FEEDS = {
  binance: {
    factory: 'src/repositories/PriceRepo/feeds/PriceRepoBinance'
  },
  huobi: {
    factory: 'src/repositories/PriceRepo/feeds/PriceRepoHuobi'
  },
  kraken: {
    factory: 'src/repositories/PriceRepo/feeds/PriceRepoKraken',
    url: 'https://api.kraken.com',
    version: '0'
  },
  bitfinex: {
    factory: 'src/repositories/PriceRepo/feeds/PriceRepoBitfinex'
  },
  idex: {
    factory: 'src/repositories/PriceRepo/feeds/PriceRepoIdex'
  },
  hitbtc: {
    factory: 'src/repositories/PriceRepo/feeds/PriceRepoHitbtc'
  },
  liquid: {
    factory: 'src/repositories/PriceRepo/feeds/PriceRepoLiquid'
  },
  uniswap: {
    factory: 'src/repositories/PriceRepo/feeds/PriceRepoUniswap'
  }
}

const STRATEGIES = {
  sequence: {
    factory: 'src/repositories/PriceRepo/strategies/sequence'
  }
}

const config = {
  priceFeedStrategiesDefault: EXCHANGE_PRICE_FEED_STRATEGIES_DEFAULT,
  priceFeedStrategies: EXCHANGE_PRICE_FEED_STRATEGIES,
  priceFeeds: PRICE_FEEDS,
  strategies: STRATEGIES
}

const priceRepo = new PriceRepoImpl(config)

priceRepo.getPrice({
  tokenA: 'GEN',
  tokenB: 'WETH'
})
  .then(response => {
    // plain response
    console.log(response)
    let price = {
      numerator: numberUtil.toBigNumber(response.toString()),
      denominator: numberUtil.ONE
    }
    let fraction = formatUtil.formatFraction(price)
    // After converting number to BigNumber and handling for printing
    console.log(fraction)
  })
  .catch(console.error)
