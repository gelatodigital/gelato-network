const loggerNamespace = 'dx-service:bots:HighSellVolumeBot'
const AuctionLogger = require('../helpers/AuctionLogger')
const Bot = require('./Bot')
const Logger = require('../helpers/Logger')
const assert = require('assert')

const logger = new Logger(loggerNamespace)
const auctionLogger = new AuctionLogger(loggerNamespace)

const numberUtil = require('../helpers/numberUtil')
const formatUtil = require('../helpers/formatUtil')
const { formatToWei, formatFromWei } = formatUtil

const BOT_TYPE = 'HighSellVolumeBot'
const getEthereumClient = require('../helpers/ethereumClient')
const getEventBus = require('../getEventBus')
const getDxInfoService = require('../services/DxInfoService')
const getMarketService = require('../services/MarketService')
const getSlackRepo = require('../repositories/SlackRepo')

const ENSURE_LIQUIDITY_PERIODIC_CHECK_MILLISECONDS =
  process.env.HIGH_SELL_VOLUME_BOT_CHECK_TIME_MS || (5 * 60 * 1000) // 5 min

const BALANCE_MARGIN_FACTOR =
  process.env.HIGH_SELL_VOLUME_BALANCE_MARGIN_FACTOR || 1.10 // 10%

class HighSellVolumeBot extends Bot {
  constructor ({
    name,
    botAddress,
    thresholdInUsd,
    accountIndex,
    markets,
    notifications,
    checkTimeInMilliseconds = ENSURE_LIQUIDITY_PERIODIC_CHECK_MILLISECONDS
  }) {
    super(name, BOT_TYPE)
    assert(markets, 'markets is required')
    assert(notifications, 'notifications is required')
    assert(checkTimeInMilliseconds, 'checkTimeInMilliseconds is required')

    if (thresholdInUsd) {
      // In thresholdInUsd mode, it'll notify if the sell volue surplus the threshold
      this._thresholdInUsd = thresholdInUsd
      this._lastNotificationAuctionIndex = {}
    } else if (botAddress) {
      // Config using bot address we'll use to check if it has enough balance
      this._botAddress = botAddress
    } else if (accountIndex !== undefined) {
      // Config using bot account address
      this._accountIndex = accountIndex
    } else {
      throw new Error('The "thresholdInUsd" or "botAddress" or "accountIndex" must be provided')
    }

    // If notification has slack, validate
    const slackNotificationConf = notifications.find(notificationType => notificationType.type === 'slack')
    if (slackNotificationConf) {
      assert(slackNotificationConf.channel, 'Slack notification config required the "channel"')
    }

    this._markets = markets
    this._notifications = notifications
    this._checkTimeInMilliseconds = checkTimeInMilliseconds

    this._lastCheck = null
    this._lastError = null
  }

  async _doInit () {
    logger.debug('Init High Sell Volume Bot: ' + this.name)

    const [
      ethereumClient,
      eventBus,
      dxInfoService,
      marketService,
      slackRepo
    ] = await Promise.all([
      getEthereumClient(),
      getEventBus(),
      getDxInfoService(),
      getMarketService(),
      getSlackRepo()
    ])
    this._ethereumClient = ethereumClient
    this._eventBus = eventBus
    this._dxInfoService = dxInfoService
    this._marketService = marketService
    this._slackRepo = slackRepo

    if (!this._thresholdInUsd) {
      // Get bot address
      await this.setAddress()
    }
  }

  async _doStart () {
    logger.debug({ msg: 'Initialized bot: ' + this.name })

    this._markets.forEach(market => {
      const sellToken = market.tokenA
      const buyToken = market.tokenB
      this._doRoutineLiquidityCheck(sellToken, buyToken)
    })

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
    return this._checkSellVolume({
      sellToken,
      buyToken
    })
  }

  async _checkSellVolume ({ sellToken, buyToken }) {
    this._lastCheck = new Date()
    let liquidityWasChecked
    try {
      // We must check both auction sides
      if (this._thresholdInUsd) {
        await Promise.all([
          this._checkSellVolumeNotGreaterThanThreshold({ sellToken, buyToken }),
          this._checkSellVolumeNotGreaterThanThreshold({ sellToken: buyToken, buyToken: sellToken })
        ])
      } else {
        await Promise.all([
          this._checkBalanceMoreThanSellVolume({ sellToken, buyToken }),
          this._checkBalanceMoreThanSellVolume({ sellToken: buyToken, buyToken: sellToken })
        ])
      }
      liquidityWasChecked = true
    } catch (error) {
      this._lastError = new Date()
      liquidityWasChecked = false
      this._handleError(sellToken, buyToken, error)
    }

    return liquidityWasChecked
  }

  async _checkSellVolumeNotGreaterThanThreshold ({ sellToken, buyToken }) {
    const lastNotifiedAuctionIndex = this._lastNotificationAuctionIndex[sellToken + '-' + buyToken]
    const auctionIndex = await this._dxInfoService.getAuctionIndex({ sellToken, buyToken })

    let checkSellVolume
    if (lastNotifiedAuctionIndex) {
      checkSellVolume = lastNotifiedAuctionIndex < auctionIndex
      logger.debug('Check sell volume for %s-%s? %s. AuctionIndex=%d, LastNotifiedAuctionIndex=%d', sellToken, buyToken, checkSellVolume, auctionIndex, lastNotifiedAuctionIndex)
    } else {
      checkSellVolume = true
      logger.debug('Checking volume for %s-%s', sellToken, buyToken)
    }

    if (checkSellVolume) {
      const sellTokenInfoPromise = this._dxInfoService.getTokenInfo(sellToken)
      const buyTokenInfoPromise = this._dxInfoService.getTokenInfo(buyToken)

      const sellVolumePromise = this._dxInfoService.getSellVolume({
        sellToken, buyToken
      })

      const [
        sellVolume,
        { decimals: sellTokenDecimals }
      ] = await Promise.all([
        sellVolumePromise,
        sellTokenInfoPromise,
        buyTokenInfoPromise
      ])

      const sellVolumeInUsd = await this._dxInfoService.getPriceInUSD({
        token: sellToken,
        amount: sellVolume
      })

      const bigSellVolume = sellVolumeInUsd.greaterThan(this._thresholdInUsd)
      logger.debug('Check if the sell volume for %s-%s is greater than $%d: %s, it\'s $%s (%d %s)',
        sellToken,
        buyToken,
        this._thresholdInUsd,
        bigSellVolume ? 'Yes' : 'No',
        numberUtil.round(sellVolumeInUsd),
        formatFromWei(sellVolume, sellTokenDecimals),
        sellToken
      )

      if (bigSellVolume) {
        this._notifyBigVolume({
          sellToken, buyToken, sellVolumeInUsd, sellVolume, sellTokenDecimals, auctionIndex
        })
      }
    }
  }

  async _checkBalanceMoreThanSellVolume ({ sellToken, buyToken }) {
    const from = this._botAddress

    logger.debug('Checking if sell volume for %s-%s can be bought by %s', sellToken, buyToken, from)
    const sellTokenInfoPromise = this._dxInfoService.getTokenInfo(sellToken)
    const buyTokenInfoPromise = this._dxInfoService.getTokenInfo(buyToken)

    const sellVolumePromise = this._dxInfoService.getSellVolume({
      sellToken, buyToken
    })

    const buyTokenBalancePromise = this._dxInfoService.getAccountBalanceForToken({
      token: buyToken, address: from
    })

    const externalPricePromise = this._marketService.getPrice({
      tokenA: sellToken, tokenB: buyToken
    })

    const [
      sellVolume,
      buyTokenBalance,
      estimatedPrice,
      { decimals: sellTokenDecimals },
      { decimals: buyTokenDecimals }
    ] = await Promise.all([
      sellVolumePromise,
      buyTokenBalancePromise,
      externalPricePromise,
      sellTokenInfoPromise,
      buyTokenInfoPromise
    ])

    const estimatedBuyVolumeInEth = formatFromWei(sellVolume, sellTokenDecimals).mul(numberUtil.toBigNumber(estimatedPrice))
    const estimatedBuyVolume = formatToWei(estimatedBuyVolumeInEth, buyTokenDecimals)
    logger.debug('Auction sell volume is %s %s and we have %s %s. With last available price %s %s/%s that should mean we need %s %s',
      formatFromWei(sellVolume, sellTokenDecimals),
      sellToken,
      formatFromWei(buyTokenBalance, buyTokenDecimals),
      buyToken,
      estimatedPrice,
      sellToken,
      buyToken,
      formatFromWei(estimatedBuyVolume, buyTokenDecimals),
      buyToken
    )

    if (estimatedBuyVolume.mul(BALANCE_MARGIN_FACTOR).greaterThan(buyTokenBalance)) {
      logger.debug('We estimate we won`t be able to buy everything')
      this._notifyBalanceBelowEstimate({
        sellToken, buyToken, from, balanceInEth: formatFromWei(buyTokenBalance, buyTokenDecimals), estimatedBuyVolumeInEth
      })
    } else {
      logger.debug('We will be able to buy everything')
    }
  }

  _notifyBigVolume ({ sellToken, buyToken, sellVolumeInUsd, sellVolume, sellTokenDecimals, auctionIndex }) {
    // Log low balance tokens
    auctionLogger.warn({
      sellToken,
      buyToken,
      msg: 'Detected a sell volume greater than %s$ for %s-%s-%d: $%d (%d %s)',
      params: [
        this._thresholdInUsd,
        sellToken,
        buyToken,
        auctionIndex,
        numberUtil.round(sellVolumeInUsd),
        formatFromWei(sellVolume, sellTokenDecimals),
        sellToken
      ],
      notify: true
    })

    this._notifications.forEach(({ type, channel }) => {
      switch (type) {
        case 'slack':
          // Notify to slack
          if (this._slackRepo.isEnabled()) {
            this._notifyBigVolumeSlack({
              channel,
              sellToken,
              buyToken,
              sellVolumeInUsd,
              sellVolume,
              sellTokenDecimals,
              auctionIndex
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

    this._lastNotificationAuctionIndex[sellToken + '-' + buyToken] = auctionIndex
  }

  _notifyBalanceBelowEstimate ({ sellToken, buyToken, from, balanceInEth, estimatedBuyVolumeInEth }) {
    // Log low balance tokens
    auctionLogger.warn({
      sellToken,
      buyToken,
      msg: "I've detected a high sell volume %s %s and we only have %s %s to ensure BUY liquidity",
      params: [
        estimatedBuyVolumeInEth,
        buyToken,
        balanceInEth,
        buyToken
      ],
      notify: true
    })

    this._notifications.forEach(({ type, channel }) => {
      switch (type) {
        case 'slack':
          // Notify to slack
          if (this._slackRepo.isEnabled()) {
            this._notifyLowBalanceSlack({
              channel,
              sellToken,
              buyToken,
              from,
              balance: balanceInEth,
              estimatedBuyVolume: estimatedBuyVolumeInEth
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

  _notifyLowBalanceSlack ({ channel, sellToken, buyToken, from, balance, estimatedBuyVolume }) {
    this._slackRepo
      .postMessage({
        channel,
        attachments: [
          {
            color: 'danger',
            title: 'High sell volume detected for ' + sellToken + '-' + buyToken,
            text: 'The bot has detected a high sell volume that won`t be able to buy.',
            fields: [
              {
                title: 'Bot name',
                value: this.name,
                short: false
              }, {
                title: 'Account',
                value: from,
                short: false
              }, {
                title: 'Token pair',
                value: sellToken + '-' + buyToken,
                short: false
              }, {
                title: 'Balance',
                value: balance + ' ' + buyToken,
                short: false
              }, {
                title: 'Estimated buy volume',
                value: estimatedBuyVolume + ' ' + buyToken,
                short: false
              }
            ],
            footer: this.botInfo
          }
        ]
      })
      .catch(error => {
        logger.error({
          msg: 'Error notifing high sell volume to Slack: ' + error.toString(),
          error
        })
      })
  }

  _notifyBigVolumeSlack ({ channel, sellToken, buyToken, sellVolumeInUsd, sellVolume, sellTokenDecimals, auctionIndex }) {
    auctionLogger.warn({
      sellToken,
      buyToken,
      msg: 'Detected a sell volume greater than %s for %s-%s-%d',
      params: [
        this._thresholdInUsd,
        sellToken,
        buyToken,
        auctionIndex
      ],
      notify: true
    })

    this._slackRepo
      .postMessage({
        channel,
        attachments: [
          {
            color: 'danger',
            title: `Detected a sell volume greater than $${this._thresholdInUsd} for ${sellToken}-${buyToken}-${auctionIndex}`,
            text: 'The bot has detected a big sell volume.',
            fields: [
              {
                title: 'Sell Volume (USD)',
                value: '$' + numberUtil.round(sellVolumeInUsd),
                short: false
              }, {
                title: `Sell Volume (${sellToken})`,
                value: formatFromWei(sellVolume, sellTokenDecimals) + ' ' + sellToken,
                short: false
              }, {
                title: 'Bot name',
                value: this.name,
                short: false
              }
            ],
            footer: this.botInfo
          }
        ]
      })
      .catch(error => {
        logger.error({
          msg: 'Error notifing high sell volume to Slack: ' + error.toString(),
          error
        })
      })
  }

  _handleError (sellToken, buyToken, error) {
    auctionLogger.error({
      sellToken,
      buyToken,
      msg: 'There was an error checking for high sell volumes for the account %s: %s',
      params: [this._botAddress, error],
      error
    })
  }

  async getInfo () {
    return {
      thresholdInUsd: this._thresholdInUsd,
      botAddress: this._botAddress,
      lastCheck: this._lastCheck,
      lastError: this._lastError,
      notifications: this._notifications,
      checkTimeInMilliseconds: this._checkTimeInMilliseconds,
      markets: this._markets
    }
  }
}

module.exports = HighSellVolumeBot
