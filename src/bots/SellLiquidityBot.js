const loggerNamespace = 'dx-service:bots:SellLiquidityBot'
const AuctionLogger = require('../helpers/AuctionLogger')
const Bot = require('./Bot')
const Logger = require('../helpers/Logger')
const assert = require('assert')

const logger = new Logger(loggerNamespace)
const auctionLogger = new AuctionLogger(loggerNamespace)
const events = require('../helpers/events')

const ENSURE_LIQUIDITY_PERIODIC_CHECK_MILLISECONDS =
  process.env.SELL_LIQUIDITY_BOT_CHECK_TIME_MS || (60 * 1000) // 1 min

const BOT_TYPE = 'SellLiquidityBot'
const getEthereumClient = require('../helpers/ethereumClient')
const getEventBus = require('../getEventBus')
const getLiquidityService = require('../services/LiquidityService')
const getSlackRepo = require('../repositories/SlackRepo')

class SellLiquidityBot extends Bot {
  constructor ({
    name,
    botAddress,
    accountIndex,
    minimumSellVolumeInUsd,
    markets,
    botTransactionsSlackChannel,
    notifications,
    checkTimeInMilliseconds = ENSURE_LIQUIDITY_PERIODIC_CHECK_MILLISECONDS
  }) {
    super(name, BOT_TYPE)
    assert(markets, 'markets is required')
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
    this._minimumSellVolumeInUsd = minimumSellVolumeInUsd
    this._notifications = notifications
    this._checkTimeInMilliseconds = checkTimeInMilliseconds

    this._lastCheck = null
    this._lastSell = null
    this._lastError = null
  }

  async _doInit () {
    logger.debug('Init Sell Bot: ' + this.name)
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

    // Ensure the sell liquidity when an aunction has ended
    this._eventBus.listenTo(events.EVENT_AUCTION_CLEARED, ({ eventName, data }) => {
      const { sellToken, buyToken } = data

      const isConfiguredMarket = this._markets.some(({ tokenA, tokenB }) => {
        return (tokenA === sellToken && tokenB === buyToken) ||
          (tokenA === buyToken && tokenB === sellToken)
      })

      if (isConfiguredMarket) {
        // Do ensure liquidity on the market
        auctionLogger.info({
          sellToken,
          buyToken,
          msg: "Auction ended. Let's ensure SELL liquidity"
        })
        this._ensureSellLiquidity({
          sellToken,
          buyToken,
          from: this._botAddress
        })
      }
    })

    // Backup strategy: From time to time, we ensure the liquidity
    // Used only in case events fail to notify the bot
    setInterval(() => {
      this._markets.forEach(market => {
        const sellToken = market.tokenA
        const buyToken = market.tokenB

        // Do ensure liquidity on the market
        auctionLogger.debug({
          sellToken,
          buyToken,
          msg: "Doing a routine check. Let's see if we need to ensure the sell liquidity"
        })
        this._ensureSellLiquidity({
          sellToken,
          buyToken,
          from: this._botAddress
        }).then(liquidityWasEnsured => {
          if (liquidityWasEnsured) {
            auctionLogger.warn({
              sellToken,
              buyToken,
              msg: "The sell liquidity was ensured by the routine check. Make sure there's no problem getting events"
            })
          }
        })
      })
    }, this._checkTimeInMilliseconds)
  }

  async _doStop () {
    logger.debug({ msg: 'Bot stopped: ' + this.name })
  }

  async _ensureSellLiquidity ({ sellToken, buyToken, from }) {
    this._lastCheck = new Date()
    let liquidityWasEnsured
    try {
      liquidityWasEnsured = await this._liquidityService
        .ensureSellLiquidity({
          sellToken,
          buyToken,
          from,
          minimumSellVolumeInUsd: this._minimumSellVolumeInUsd
        })
        .then(soldTokens => {
          let liquidityWasEnsured = soldTokens.length > 0
          if (liquidityWasEnsured) {
            // The bot sold some tokens
            this._lastSell = new Date()
            soldTokens.forEach(sellOrder => {
              // Notify the sold tokens
              this._notifySoldTokens(sellOrder)
            })
          } else {
            // The bot didn't have to do anything
            auctionLogger.debug({
              sellToken,
              buyToken,
              msg: 'Nothing to do'
            })
          }

          return liquidityWasEnsured
        })
    } catch (error) {
      liquidityWasEnsured = false
      this._lastError = new Date()
      this._handleError(sellToken, buyToken, error)
    }

    return liquidityWasEnsured
  }

  _notifySoldTokens (sellOrder) {
    const {
      sellToken,
      buyToken,
      amount,
      amountInUSD,
      auctionIndex
    } = sellOrder
    // Log sold tokens
    const amountInTokens = amount.div(1e18)
    const soldTokensString = amountInTokens + ' ' + sellToken

    auctionLogger.info({
      sellToken,
      buyToken,
      msg: "I've sold %s (%d USD) in auction %d to ensure SELL liquidity",
      params: [
        soldTokensString,
        amountInUSD,
        auctionIndex
      ],
      notify: true
    })

    this._notifications.forEach(({ type, channel }) => {
      switch (type) {
        case 'slack':
          // Notify to slack
          if (this._slackRepo.isEnabled()) {
            this._notifySoldTokensSlack({
              channel,
              soldTokensString,
              sellToken,
              buyToken,
              auctionIndex,
              amountInUSD
            })
          }
          break
        case 'email':
        default:
          logger.error({
            msg: 'Error notification type is unknown: ' + type
          })
      }
    })
  }

  _notifySoldTokensSlack ({ channel, soldTokensString, sellToken, buyToken, auctionIndex, amountInUSD }) {
    this._slackRepo
      .postMessage({
        channel,
        attachments: [
          {
            color: 'good',
            title: 'The bot has sold ' + soldTokensString,
            text: 'The bot has sold tokens to ensure the sell liquidity.',
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
                title: 'Sold tokens',
                value: soldTokensString,
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
          msg: 'Error notifing sold tokens to Slack: ' + error.toString(),
          error
        })
      })
  }

  _handleError (sellToken, buyToken, error) {
    auctionLogger.error({
      sellToken,
      buyToken,
      msg: 'There was an error ensuring sell liquidity with the account %s: %s',
      params: [this._botAddress, error],
      error
    })
  }

  async getInfo () {
    return {
      botAddress: this._botAddress,
      minimumSellVolumeInUsd: this._minimumSellVolumeInUsd,
      lastCheck: this._lastCheck,
      lastSell: this._lastSell,
      lastError: this._lastError,
      notifications: this._notifications,
      checkTimeInMilliseconds: this._checkTimeInMilliseconds,
      markets: this._markets
    }
  }
}

module.exports = SellLiquidityBot
