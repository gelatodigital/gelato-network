/*
* Example of conf to test to override
*/

// FIXME remove this when deployed by devops
const MARKETS = [
  // { tokenA: 'WETH', tokenB: 'RDN' },
  // { tokenA: 'WETH', tokenB: 'OMG' },
  { tokenA: 'WETH', tokenB: 'DAI' },
  { tokenA: 'WETH', tokenB: 'GEN' },
  { tokenA: 'WETH', tokenB: 'MKR' }
]

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
    feeds: ['hitbtc', 'bitfinex']
  },
  'WETH-MKR': {
    strategy: 'sequence',
    feeds: ['hitbtc', 'bitfinex']
  },
  'WETH-GEN': {
    strategy: 'sequence',
    feeds: ['liquid']
  }
}

const DAI_TOKEN_ADDRESS = '0x1638578de407719a486db086b36b53750db0199e'
const GEN_TOKEN_ADDRESS = '0xa1f34744c80e7a9019a5cd2bf697f13df00f9773'
const MKR_TOKEN_ADDRESS = '0xe315cb6fa401092a7ecc92f05c62d05a974012f4'

const TOKEN_ADDRESSES = [
  DAI_TOKEN_ADDRESS,
  GEN_TOKEN_ADDRESS,
  MKR_TOKEN_ADDRESS
]

const MAIN_BOT_ACCOUNT = 0
const BACKUP_BOT_ACCOUNT = 0

const BUY_BOT_HOSTED_MARKETS = {
  name: 'Main buyer bot: RDN, OMG',
  factory: 'src/bots/BuyLiquidityBot',
  markets: [
    { tokenA: 'WETH', tokenB: 'RDN' },
    { tokenA: 'WETH', tokenB: 'OMG' }
  ],
  accountIndex: MAIN_BOT_ACCOUNT,
  rules: [
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
  ],
  notifications: [{
    type: 'slack',
    channel: '' // If none provided uses SLACK_CHANNEL_BOT_TRANSACTIONS
  }],
  checkTimeInMilliseconds: 60 * 1000 // 60s
}

const BUY_BOT_EXTERNAL_MARKETS = {
  name: 'Main buyer bot: DAI, GEN, MKR',
  factory: 'src/bots/BuyLiquidityBot',
  markets: [
    { tokenA: 'WETH', tokenB: 'DAI' },
    { tokenA: 'WETH', tokenB: 'GEN' },
    { tokenA: 'WETH', tokenB: 'MKR' }
  ],
  accountIndex: MAIN_BOT_ACCOUNT,
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
}

const BACKUP_BUYER_BOT = {
  name: 'Backup buyer for RDN-WETH',
  factory: 'src/bots/BuyLiquidityBot',
  markets: [
    { tokenA: 'WETH', tokenB: 'RDN' }
  ],
  accountIndex: BACKUP_BOT_ACCOUNT,
  rules: [{
    // Buy the 100% if price falls below 90%
    marketPriceRatio: {
      numerator: 90,
      denominator: 100
    },
    buyRatio: {
      numerator: 1,
      denominator: 1
    }
  }],
  minimumAmountInUsdForToken: 850 // $850,
}

const SELL_BOT_MAIN = {
  name: 'Main seller bot',
  factory: 'src/bots/SelliquidityBot',
  markets: HOSTED_MARKETS,
  accountIndex: MAIN_BOT_ACCOUNT,
  minimumAmountInUsdForToken: 5000, // $5000,
  minimumAmountForEther: 0.4 * 1e18, // 0.4 ETH
  notifications: [{
    type: 'slack',
    channel: '' // If none provided uses SLACK_CHANNEL_BOT_TRANSACTIONS
  }]
}

const SELL_BOT_BACKUP = {
  name: 'Main seller bot: DAI, GEN MKR',
  factory: 'src/bots/SelliquidityBot',
  markets: EXTERNAL_MARKETS,
  accountIndex: MAIN_BOT_ACCOUNT,
  minimumAmountInUsdForToken: 5000, // $5000,
  minimumAmountForEther: 0.4 * 1e18, // 0.4 ETH
  notifications: [{
    type: 'slack',
    channel: '' // If none provided uses SLACK_CHANNEL_BOT_TRANSACTIONS
  }]
}

const DEPOSIT_BOT = {
  name: 'Deposit bot',
  factory: 'src/bots/DepositBot',
  notifications: [{
    type: 'slack',
    channel: '' // If none provided uses SLACK_CHANNEL_BOT_TRANSACTIONS
  }],
  // You can use this to have some time to manually withdraw funds
  inactivityPeriods: [{
    from: '11:30',
    to: '12:00'
  }, {
    from: '15:30',
    to: '16:00'
  }],
  checkTimeInMilliseconds: 5 * 60 * 1000 // 5min
}

const BALANCE_CHECK_BOT = {
  name: 'BalanceCheckBot',
  factory: 'src/bots/BalanceCheckBot',
  liquidityService: this._liquidityService,
  dxInfoService: this._dxInfoService,
  ethereumClient: this._ethereumClient,
  tokensByAccount,
  slackRepo: this._slackRepo,
  botFundingSlackChannel: this._config.SLACK_CHANNEL_BOT_FUNDING
}

/*
const HIGH_SELL_VOLUME_BOT = {
  name: 'HighSellVolumeBot for: ' + botConfig.name,
  factory: 'src/bots/HighLiquidityBot',
  dxInfoService: this._dxInfoService,
  marketService: this._marketService,
  botAddress: 'TODO:',
  slackRepo: this._slackRepo,
  botTransactionsSlackChannel: this._config.SLACK_CHANNEL_BOT_FUNDING,
  // ...aditionalBotConfig TODO:
}
*/

module.exports = {
  // FIXME remove when deployed by devops
  MARKETS,
  ...TOKEN_ADDRESSES,

  BOTS: [
    BUY_BOT_HOSTED_MARKETS
    /*
    // Buy bots
    BUY_BOT_HOSTED_MARKETS,
    BUY_BOT_EXTERNAL_MARKETS,
    BACKUP_BUYER_BOT,

    // Sell bots
    SELL_BOT_MAIN,
    SELL_BOT_BACKUP,

    // Deposit bots
    DEPOSIT_BOT,

    // Health check bots
    BALANCE_CHECK_BOT,
    HIGH_SELL_VOLUME_BOT
    */
  ],
  // MAIN_BOT_ACCOUNT,
  // BUY_LIQUIDITY_RULES_DEFAULT,
  EXCHANGE_PRICE_FEED_STRATEGIES,

  DAI_TOKEN_ADDRESS,
  GEN_TOKEN_ADDRESS,
  MKR_TOKEN_ADDRESS
}
