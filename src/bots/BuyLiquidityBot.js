const loggerNamespace = 'dx-service:bots:BuyLiquidityBot'
const AuctionLogger = require('../helpers/AuctionLogger')
const Bot = require('./Bot')
const Logger = require('../helpers/Logger')
const assert = require('assert')

const logger = new Logger(loggerNamespace)
const auctionLogger = new AuctionLogger(loggerNamespace)

const BOT_TYPE = 'BuyLiquidityBot'
const getEthereumClient = require('../helpers/ethereumClient')
const getEventBus = require('../getEventBus')
const getLiquidityService = require('../services/LiquidityService')
const getSlackRepo = require('../repositories/SlackRepo')

const ENSURE_LIQUIDITY_PERIODIC_CHECK_MILLISECONDS =
  process.env.BUY_LIQUIDITY_BOT_CHECK_TIME_MS || (60 * 1000) // 1 min

class BuyLiquidityBot extends Bot {
  constructor ({
    name,
    botAddress,
    accountIndex,
    markets,
    rules,
    notifications,
    checkTimeInMilliseconds = ENSURE_LIQUIDITY_PERIODIC_CHECK_MILLISECONDS
  }) {
    super(name, BOT_TYPE)
    assert(markets, 'markets is required')
    assert(rules, 'buyLiquidityRules is required')
    assert(notifications, 'notifications is required')
    assert(checkTimeInMilliseconds, 'checkTimeInMilliseconds is required')

    if (botAddress) {
      // Config using bot address
      assert(botAddress, 'botAddress is required')
      this._botAddress = botAddress
    } else {
      // Config using bot account address
      assert(accountIndex !== undefined, '"botAddress" or "accountIndex" is required')
      this._accountIndex = accountIndex
    }

    // If notification has slack, validate
    const slackNotificationConf = notifications.find(notificationType => notificationType.type === 'slack')
    if (slackNotificationConf) {
      assert(slackNotificationConf.channel, 'Slack notification config required the "channel"')
    }

    this._markets = markets
    this._rules = rules
    this._notifications = notifications
    this._checkTimeInMilliseconds = checkTimeInMilliseconds

    this._lastCheck = null
    this._lastBuy = null
    this._lastError = null
  }

  async _doInit () {
    logger.debug('Init Buy Bot: ' + this.name)
    const [
      ethereumClient,
      eventBus,
      liquidityService,
      slackRepo
    ] = await Promise.all([
      getEthereumClient(),
      getEventBus(),
      getLiquidityService(),
      getSlackRepo()
    ])
    this._ethereumClient = ethereumClient
    this._eventBus = eventBus
    this._liquidityService = liquidityService
    this._slackRepo = slackRepo

    // Set bot address
    await this.setAddress()
  }

  async _doStart () {
    logger.debug({ msg: 'Initialized bot: ' + this.name })

    // Check the liquidity periodically
    setInterval(() => {
      this._markets.forEach(market => {
        const sellToken = market.tokenA
        const buyToken = market.tokenB
        this._doRoutineLiquidityCheck(sellToken, buyToken)
      })
    }, this._checkTimeInMilliseconds)
  }

  async _doStop () {
    logger.debug({ msg: 'Bot stopped: ' + this.name })
  }

  async _doRoutineLiquidityCheck (sellToken, buyToken) {
    // Do ensure liquidity on the market
    auctionLogger.debug({
      sellToken,
      buyToken,
      msg: "Doing a routine check. Let's see if we need to ensure the liquidity"
    })
    return this._ensureBuyLiquidity({
      sellToken,
      buyToken,
      from: this._botAddress
    })
  }

  async _ensureBuyLiquidity ({ sellToken, buyToken, from }) {
    this._lastCheck = new Date()
    let liquidityWasEnsured
    const buyLiquidityRules = this._rules
    try {
      liquidityWasEnsured = await this._liquidityService
        .ensureBuyLiquidity({ sellToken, buyToken, from, buyLiquidityRules })
        .then(boughtTokens => {
          let liquidityWasEnsured = boughtTokens.length > 0
          if (liquidityWasEnsured) {
            // The bot bought some tokens
            this._lastBuy = new Date()
            boughtTokens.forEach(buyOrder => {
              this._notifyBuyedTokens(buyOrder)
            })
          } else {
            // The bot didn't have to do anything
            auctionLogger.debug({
              sellToken,
              buyToken,
              msg: 'Nothing to do'
            })
          }

          return true
        })
    } catch (error) {
      this.lastError = new Date()
      liquidityWasEnsured = false
      this._handleError(sellToken, buyToken, error)
    }

    return liquidityWasEnsured
  }

  _notifyBuyedTokens (buyOrder) {
    const {
      sellToken,
      buyToken,
      amount,
      amountInUSD,
      auctionIndex
    } = buyOrder
    // Log sold tokens
    const amountInTokens = amount.div(1e18)
    const boughtTokensString = amountInTokens + ' ' + buyToken

    auctionLogger.info({
      sellToken,
      buyToken,
      msg: "I've bought %s (%d USD) in auction %d to ensure BUY liquidity",
      params: [
        boughtTokensString,
        amountInUSD,
        auctionIndex
      ],
      notify: true
    })

    // TODO: Improve notifications. Decouple this into a strategy pattern
    this._notifications.forEach(({ type, channel }) => {
      switch (type) {
        case 'slack':
          // Notify to slack
          if (this._slackRepo.isEnabled()) {
            this._notifyBuyedTokensSlack({
              channel,
              boughtTokensString,
              sellToken,
              buyToken,
              auctionIndex,
              amountInUSD
            })
          }
          break
        case 'email':
          throw new Error('Not implemented yet')
        default:
          logger.error({
            msg: 'Error notification type is unknown: ' + type
          })
      }
    })
  }

  _notifyBuyedTokensSlack ({ channel, boughtTokensString, sellToken, buyToken, auctionIndex, amountInUSD }) {
    this._slackRepo
      .postMessage({
        channel,
        attachments: [
          {
            color: 'good',
            title: 'The bot has bought ' + boughtTokensString,
            text: 'The bot has bought tokens to ensure the buy liquidity.',
            fields: [
              {
                title: 'Bot name',
                value: this.name,
                short: false
              }, {
                title: 'Token pair',
                value: sellToken + '-' + buyToken,
                short: false
              }, {
                title: 'Auction index',
                value: auctionIndex,
                short: false
              }, {
                title: 'Bought tokens',
                value: boughtTokensString,
                short: false
              }, {
                title: 'USD worth',
                value: '$' + amountInUSD,
                short: false
              }
            ],
            footer: this.botInfo
          }
        ]
      })
      .catch(error => {
        logger.error({
          msg: 'Error notifing bought tokens to Slack: ' + error.toString(),
          error
        })
      })
  }

  _handleError (sellToken, buyToken, error) {
    auctionLogger.error({
      sellToken,
      buyToken,
      msg: 'There was an error buy ensuring liquidity with the account %s: %s',
      params: [this._botAddress, error],
      error
    })
  }

  async getInfo () {
    return {
      botAddress: this._botAddress,
      lastCheck: this._lastCheck,
      lastBuy: this._lastBuy,
      lastError: this._lastError,
      rules: this._rules,
      notifications: this._notifications,
      checkTimeInMilliseconds: this._checkTimeInMilliseconds,
      markets: this._markets
    }
  }
}

module.exports = BuyLiquidityBot
