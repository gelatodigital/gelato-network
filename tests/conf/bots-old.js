// FIXME remove this when deployed by devops
const MARKETS = [
  // { tokenA: 'WETH', tokenB: 'RDN' },
  // { tokenA: 'WETH', tokenB: 'OMG' },
  { tokenA: 'WETH', tokenB: 'DAI' },
  { tokenA: 'WETH', tokenB: 'GEN' },
  { tokenA: 'WETH', tokenB: 'MKR' }]

const BUY_LIQUIDITY_RULES_DEFAULT = [
  // Buy 1/2 if price falls below 99%

  {
    marketPriceRatio: {
      numerator: 99,
      denominator: 100
    },
    buyRatio: {
      numerator: 1,
      denominator: 2
    }
  },

  // Buy the 100% if price falls below 96%
  {
    marketPriceRatio: {
      numerator: 96,
      denominator: 100
    },
    buyRatio: {
      numerator: 1,
      denominator: 1
    }
  }
]

const MAIN_BOT_ACCOUNT = 0

const BUY_LIQUIDITY_BOTS = [{
//   name: 'Main buyer bot',
//   markets: [
//     { tokenA: 'WETH', tokenB: 'RDN' },
//     { tokenA: 'WETH', tokenB: 'OMG' }
//   ],
//   accountIndex: MAIN_BOT_ACCOUNT,
//   rules: BUY_LIQUIDITY_RULES_DEFAULT,
//   notifications: [{
//     type: 'slack',
//     channel: '' // If none provided uses SLACK_CHANNEL_BOT_TRANSACTIONS
//   }],
//   checkTimeInMilliseconds: 60 * 1000 // 60s
// }, {
//   name: 'Backup buyer for RDN-WETH',
//   markets: [
//     { tokenA: 'WETH', tokenB: 'RDN' }
//   ],
//   accountIndex: 1,
//   rules: [{
//     // Buy the 100% if price falls below 90%
//     marketPriceRatio: {
//       numerator: 90,
//       denominator: 100
//     },
//     buyRatio: {
//       numerator: 1,
//       denominator: 1
//     }
//   }]
// }, {
  name: 'Backup buyer for DAI, GEN and MKR',
  markets: [
    { tokenA: 'WETH', tokenB: 'DAI' },
    { tokenA: 'WETH', tokenB: 'GEN' },
    { tokenA: 'WETH', tokenB: 'MKR' }
  ],
  accountIndex: 0,
  rules: [{
    // Buy the 100% if price falls below 94%
    marketPriceRatio: {
      numerator: 94,
      denominator: 100
    },
    buyRatio: {
      numerator: 1,
      denominator: 1
    }
  }],
  notifications: [{
    type: 'slack',
    channel: '' // If none provided uses SLACK_CHANNEL_BOT_TRANSACTIONS
  }],
  checkTimeInMilliseconds: 60 * 1000 // 60s
}]

const SELL_LIQUIDITY_BOTS = [{
  // name: 'Main seller bot',
  // markets: MARKETS,
  // accountIndex: MAIN_BOT_ACCOUNT,
  // notifications: [{
  //   type: 'slack',
  //   channel: '' // If none provided uses SLACK_CHANNEL_BOT_TRANSACTIONS
  // }],
  // checkTimeInMilliseconds: 60 * 1000 // 60s
  name: 'Backup seller for DAI, GEN and MKR',
  markets: [
    { tokenA: 'WETH', tokenB: 'DAI' },
    { tokenA: 'WETH', tokenB: 'GEN' },
    { tokenA: 'WETH', tokenB: 'MKR' }
  ],
  accountIndex: MAIN_BOT_ACCOUNT,
  notifications: [{
    type: 'slack',
    channel: '' // If none provided uses SLACK_CHANNEL_BOT_TRANSACTIONS
  }],
  checkTimeInMilliseconds: 60 * 1000 // 60s
}]

const EXCHANGE_PRICE_FEED_STRATEGIES = {
  'WETH-OMG': {
    strategy: 'sequence',
    feeds: ['binance', 'huobi', 'bitfinex']
  },
  'WETH-RDN': {
    strategy: 'sequence',
    feeds: ['huobi', 'binance', 'bitfinex']
  },
  'WETH-DAI': {
    strategy: 'sequence',
    feeds: ['hitbtc', 'bitfinex', 'binance']
  },
  'WETH-GEN': {
    strategy: 'sequence',
    feeds: ['idex', 'liquid']
  },
  'WETH-MKR': {
    strategy: 'sequence',
    feeds: ['hitbtc', 'bitfinex', 'binance']
  }
}

const DAI_TOKEN_ADDRESS = '0x1638578de407719a486db086b36b53750db0199e'
const GEN_TOKEN_ADDRESS = '0xa1f34744c80e7a9019a5cd2bf697f13df00f9773'
const MKR_TOKEN_ADDRESS = '0xe315cb6fa401092a7ecc92f05c62d05a974012f4'

module.exports = {
  // FIXME remove when deployed by devops
  MARKETS,
  MAIN_BOT_ACCOUNT,
  BUY_LIQUIDITY_BOTS,
  SELL_LIQUIDITY_BOTS,
  BUY_LIQUIDITY_RULES_DEFAULT,
  EXCHANGE_PRICE_FEED_STRATEGIES,

  DAI_TOKEN_ADDRESS,
  GEN_TOKEN_ADDRESS,
  MKR_TOKEN_ADDRESS
}
