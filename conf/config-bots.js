// Just some defaults. Overrided on custom config or by env varible (see index.js)
const { MARKETS, TOKENS, ARBITRAGE_CONTRACT_ADDRESS } = require('./developConstants')
const BOT_MARKETS = MARKETS
const BOT_TOKENS = TOKENS

const MAIN_BOT_ACCOUNT = 0
const BACKUP_BOT_ACCOUNT = 1

// If using slack, we add the notification channel
let slackChannel = _getBotsNotificationChannel()
const notifications = []
if (slackChannel) {
  notifications.push({
    type: 'slack',
    channel: slackChannel
  })
}

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

const BUY_BOT_MAIN = {
  name: 'Main buyer bot',
  factory: 'src/bots/BuyLiquidityBot',
  markets: BOT_MARKETS,
  accountIndex: MAIN_BOT_ACCOUNT,
  rules: BUY_LIQUIDITY_RULES_DEFAULT,
  notifications,
  checkTimeInMilliseconds: 60 * 1000 // 60s
}

const ARBITRAGE_BOT = {
  name: 'Arbitrage bot',
  factory: 'src/bots/ArbitrageBot',
  markets: BOT_MARKETS,
  accountIndex: MAIN_BOT_ACCOUNT,
  arbitrageContractAddress: ARBITRAGE_CONTRACT_ADDRESS,
  minimumProfitInUsd: 5,
  notifications,
  checkTimeInMilliseconds: 60 * 1000 // 60s
}

const BUY_BOT_BACKUP = {
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
  notifications,
  checkTimeInMilliseconds: 60 * 1000, // 60s
  disableHighSellVolumeCheck: true,
  minimumAmountInUsdForToken: 850 // $850
}

const SELL_BOT_MAIN = {
  name: 'Main seller bot',
  factory: 'src/bots/SellLiquidityBot',
  markets: BOT_MARKETS,
  accountIndex: MAIN_BOT_ACCOUNT,
  // minimumSellVolumeInUsd: null,
  notifications,
  checkTimeInMilliseconds: 60 * 1000 // 60s
}

const BALANCE_CHECK_BOT = {
  name: 'Balance check bot',
  factory: 'src/bots/BalanceCheckBot',
  tokens: BOT_TOKENS,
  accountIndex: MAIN_BOT_ACCOUNT,
  // botAddress: '0x1554238f49f8bd2f78d438fcd7d4396dfc0dd2ed',
  // botAddressForEther: '0x1554238f49f8bd2f78d438fcd7d4396dfc0dd2ed',
  // botAddressForTokens: '0x25b8c27508a59bf498646d8819dc349876789f83',
  notifications,
  minimumAmountForEther: 0.4,
  minimumAmountInUsdForToken: 5000
}

const HIGH_SELL_VOLUME_BOT = {
  name: 'High sell volume bot',
  factory: 'src/bots/HighSellVolumeBot',
  markets: BOT_MARKETS,
  accountIndex: MAIN_BOT_ACCOUNT,
  notifications
}

// Watch events and notify the event bus
//   - Other bots, like the sell bot depends on it
const WATCH_EVENTS_BOTS = {
  name: 'Watch events bot',
  markets: MARKETS,
  factory: 'src/bots/WatchEventsBot'
}

// TODO Enable by default in future versions
const DEPOSIT_BOT = {
  name: 'Deposit bot',
  factory: 'src/bots/DepositBot',
  tokens: BOT_TOKENS,
  accountIndex: MAIN_BOT_ACCOUNT,
  notifications,
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

const AUTO_CLAIM_AUCTIONS = 90

// TODO Enable by default in future versions
const CLAIM_BOT = {
  name: 'Claim bot',
  factory: 'src/bots/ClaimBot',
  markets: BOT_MARKETS,
  accountIndex: MAIN_BOT_ACCOUNT,
  notifications,
  // You can use this to have some time to manually withdraw funds
  autoClaimAuctions: AUTO_CLAIM_AUCTIONS,
  cronSchedule: '00  02,06,10,14,18,22  *  *  *' // Each 4 hours
}

module.exports = {
  BOTS: [
    BUY_BOT_MAIN,
    SELL_BOT_MAIN,
    BALANCE_CHECK_BOT,
    ARBITRAGE_BOT,
    // DEPOSIT_BOT,
    // CLAIM_BOT,
    HIGH_SELL_VOLUME_BOT,
    WATCH_EVENTS_BOTS
  ],

  // TODO: Try to remove the next props
  // MAIN_BOT_ACCOUNT,
  BUY_LIQUIDITY_RULES_DEFAULT,
  AUTO_CLAIM_AUCTIONS
}

function _getBotsNotificationChannel () {
  const environment = process.env.NODE_ENV
  const { DX_BOTS_DEV_CHANNEL } = require('./slackChannels')
  switch (environment) {
    case 'dev':
      return DX_BOTS_DEV_CHANNEL
    default:
      return null
  }
}
