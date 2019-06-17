const loggerNamespace = 'dx-service:bots:BalanceCheckBot'
const Bot = require('./Bot')
const Logger = require('../helpers/Logger')
const logger = new Logger(loggerNamespace)
const assert = require('assert')

const getAddress = require('../helpers/getAddress')
const getEthereumClient = require('../helpers/ethereumClient')
const formatUtil = require('../helpers/formatUtil')
const numberUtil = require('../helpers/numberUtil')

const BOT_TYPE = 'BalanceCheckBot'

const getLiquidityService = require('../services/LiquidityService')
const getDxInfoService = require('../services/DxInfoService')
const getSlackRepo = require('../repositories/SlackRepo')

const checkTimeMinutes = process.env.BALANCE_BOT_CHECK_TIME_MINUTES || 15 // 15 min
const slackThresholdMinutes = process.env.BALANCE_BOT_SLACK_THESHOLD_MINUTES || (4 * 60) // 4h
const PERIODIC_CHECK_MILLISECONDS = checkTimeMinutes * 60 * 1000
const MINIMUM_TIME_BETWEEN_SLACK_NOTIFICATIONS = slackThresholdMinutes * 60 * 1000

class BalanceCheckBot extends Bot {
  constructor ({
    name,
    botAddress,
    accountIndex,
    botAddressForEther,
    botAddressForTokens,
    tokens = [],
    notifications = [],
    minimumAmountForEther = 0.7,
    minimumAmountInUsdForToken = 5000,
    minimumAmountInUsdForTokenBalance = 0,
    minimumAmountForOwl = 0
  }) {
    super(name, BOT_TYPE)
    assert(tokens, 'tokens is required')
    assert(notifications, 'notifications is required')
    assert(botAddress || accountIndex !== undefined || (botAddressForEther && botAddressForTokens) !== undefined, '"botAddress" or "accountIndex" or "botAddressForEth + botAddressForTokens" is required')

    // If notification has slack, validate
    const slackNotificationConf = notifications.find(notificationType => notificationType.type === 'slack')
    if (slackNotificationConf) {
      assert(slackNotificationConf.channel, 'Slack notification config required the "channel"')
    }

    this._tokens = tokens
    this._botAddress = botAddress
    this._accountIndex = accountIndex
    this._botAddressForEther = botAddressForEther
    this._botAddressForTokens = botAddressForTokens

    this._notifications = notifications
    this._minimumAmountForEther = minimumAmountForEther * 1e18 // all balances are compared in WEI
    this._minimumAmountInUsdForToken = minimumAmountInUsdForToken
    this._minimumAmountInUsdForTokenBalance = minimumAmountInUsdForTokenBalance
    this._minimumAmountForOwl = minimumAmountForOwl

    this._lastCheck = null
    this._lastWarnNotification = null
    this._lastError = null
    this._lastSlackEtherBalanceNotification = null
    this._lastSlackTokenBalanceNotification = null
  }

  async _doInit () {
    logger.debug('Init Balance Check Bot: ' + this.name)
    const [
      ethereumClient,
      dxInfoService,
      liquidityService,
      slackRepo
    ] = await Promise.all([
      getEthereumClient(),
      getDxInfoService(),
      getLiquidityService(),
      getSlackRepo()
    ])
    this._ethereumClient = ethereumClient
    this._dxInfoService = dxInfoService
    this._liquidityService = liquidityService
    this._slackRepo = slackRepo

    // Get bot address
    if (!this._botAddressForEther || !this._botAddressForTokens) {
      if (this._accountIndex !== undefined) {
        // Setup the bot address using account index
        await this.setAddress()
      }

      // Init the addresses
      if (this._botAddress) {
        // Config using bot address
        this._botAddressForEther = this._botAddress
        this._botAddressForTokens = this._botAddress
        this._botAddress = await getAddress(this._accountIndex)
      } else {
        throw new Error('Address configuration error')
      }
    }

    delete this._accountIndex
    delete this._botAddress
  }

  async _doStart () {
    logger.debug({ msg: 'Initialized bot: ' + this.name })

    // Check the bots balance periodically
    this._checkBalance()
    setInterval(() => {
      return this._checkBalance()
    }, PERIODIC_CHECK_MILLISECONDS)
  }

  async _doStop () {
    logger.debug({ msg: 'Bot stopped: ' + this.name })
  }

  async _checkBalance () {
    this._lastCheck = new Date()
    let botHasEnoughTokens = true
    try {
      const {
        balanceOfEther,
        dxBalanceOfTokens,
        erc20BalanceOfTokens,
        owlBalance
      } = await this._getAllBalances()

      // Check if the account has ETHER below the minimum amount
      if (this._minimumAmountForEther > 0) {
        if (balanceOfEther < this._minimumAmountForEther) {
          this._lastWarnNotification = new Date()
          // Notify lack of ether
          this._notifyLackOfEther(balanceOfEther, this._botAddressForEther, this._minimumAmountForEther)
        } else {
          logger.debug('The account %s has enough Ether', this._botAddressForEther)
        }
      }

      // Check if there are enough tokens in the DutchX
      if (this._minimumAmountInUsdForToken > 0) {
        const dxTokenBelowMinimum = dxBalanceOfTokens.filter(balanceInfo => {
          return balanceInfo.amountInUSD.lessThan(this._minimumAmountInUsdForToken)
        })

        if (dxTokenBelowMinimum.length > 0) {
          // Notify lack of tokens in DutchX
          this._notifyLackOfTokens(
            'DutchX balance',
            dxTokenBelowMinimum,
            this._botAddressForTokens,
            this._minimumAmountInUsdForToken
          )
          botHasEnoughTokens = false
        } else {
          logger.debug('The account %s has enough tokens in the DutchX', this._botAddressForTokens)
        }
      }

      // Check if there are enough tokens (ERC20 contract)
      if (this._minimumAmountInUsdForTokenBalance > 0) {
        const erc20TokenBelowMinimum = erc20BalanceOfTokens.filter(balanceInfo => {
          return balanceInfo.amountInUSD.lessThan(this._minimumAmountInUsdForTokenBalance)
        })

        if (erc20TokenBelowMinimum.length > 0) {
          // Notify lack of tokens in DutchX
          this._notifyLackOfTokens(
            'ERC20 balance',
            erc20TokenBelowMinimum,
            this._botAddressForTokens,
            this._minimumAmountInUsdForTokenBalance
          )
          botHasEnoughTokens = false
        } else {
          logger.debug('The account %s has enough balance in the ERC20 contract', this._botAddressForTokens)
        }
      }

      if (this._minimumAmountForOwl) {
        if (owlBalance.amount.lessThan(this._minimumAmountForOwl)) {
          // Notify lack of tokens in DutchX
          this._notifyLackOfTokens(
            'OWL balance',
            [owlBalance],
            this._botAddressForTokens,
            this._minimumAmountForOwl,
            false
          )
          botHasEnoughTokens = false
        } else {
          logger.debug('The account %s has enough tokens in the DutchX', this._botAddressForTokens)
        }
      }
    } catch (error) {
      this.lastError = new Date()
      botHasEnoughTokens = false
      logger.error({
        msg: 'There was an error checking the balance for the bot: %s',
        params: [error],
        error
      })
    }

    return botHasEnoughTokens
  }

  async getInfo () {
    let addresses
    if (this._botAddressForEther === this._botAddressForTokens) {
      addresses = {
        botAddress: this._botAddressForEther
      }
    } else {
      addresses = {
        botAddressForEther: this._botAddressForEther,
        botAddressForTokens: this._botAddressForTokens
      }
    }

    return {
      ...addresses,
      tokens: this._tokens,

      minimumAmountForEther: this._minimumAmountForEther,
      minimumAmountInUsdForToken: this._minimumAmountInUsdForToken,
      minimumAmountInUsdForTokenBalance: this._minimumAmountInUsdForTokenBalance,
      minimumAmountForOwl: this._minimumAmountForOwl,

      lastCheck: this._lastCheck,
      lastWarnNotification: this._lastWarnNotification,
      lastError: this._lastError,
      notifications: this._notifications,
      lastSlackEtherBalanceNotification: this._lastSlackEtherBalanceNotification,
      lastSlackTokenBalanceNotification: this._lastSlackTokenBalanceNotification
    }
  }

  async _getAllBalances () {
    // Get ETH balance
    let balanceOfEtherPromise
    if (this._minimumAmountForEther > 0) {
      balanceOfEtherPromise = this._dxInfoService.getBalanceOfEther({
        account: this._botAddressForEther
      })
    } else {
      balanceOfEtherPromise = Promise.resolve(null)
    }

    // Get DutchX balance of ERC20 tokens
    let dxBalanceOfTokensPromise
    if (this._minimumAmountInUsdForToken > 0) {
      dxBalanceOfTokensPromise = this._liquidityService.getBalancesDx({
        tokens: this._tokens,
        address: this._botAddressForTokens
      })
    } else {
      dxBalanceOfTokensPromise = Promise.resolve(null)
    }

    // Get balance for ERC20 tokens
    let erc20BalanceOfTokensPromise
    if (this._minimumAmountInUsdForTokenBalance > 0) {
      erc20BalanceOfTokensPromise = this._liquidityService.getBalancesErc20({
        tokens: this._tokens,
        address: this._botAddressForTokens
      })
    } else {
      erc20BalanceOfTokensPromise = Promise.resolve(null)
    }

    // Get OWL balance
    let owlBalancePromise
    if (this._minimumAmountForOwl > 0) {
      owlBalancePromise = this._liquidityService.getBalancesErc20({
        tokens: ['OWL'],
        address: this._botAddressForTokens,
        getAmountUsd: false
      }).then(balances => {
        return balances[0]
      })
    } else {
      owlBalancePromise = Promise.resolve(null)
    }

    const [
      balanceOfEther,
      dxBalanceOfTokens,
      erc20BalanceOfTokens,
      owlBalance
    ] = await Promise.all([
      balanceOfEtherPromise,
      dxBalanceOfTokensPromise,
      erc20BalanceOfTokensPromise,
      owlBalancePromise
    ])

    return {
      balanceOfEther,
      dxBalanceOfTokens,
      erc20BalanceOfTokens,
      owlBalance
    }
  }

  _notifyLackOfEther (balanceOfEther, account, minimumAmountForEther) {
    const minimumAmount = minimumAmountForEther * 1e-18
    const balance = balanceOfEther.div(1e18).valueOf()

    const message = 'The account account has ETHER balance below ' + minimumAmount

    // Log message
    logger.warn({
      msg: `[${account}] ${message} - ${this.name}`,
      contextData: {
        extra: {
          balanceOfEther: balance,
          account
        }
      },
      notify: true
    })

    this._notifications.forEach(({ type, channel }) => {
      switch (type) {
        case 'slack':
          if (this._slackRepo.isEnabled()) {
            // Notify to slack
            this._notifyToSlack({
              channel,
              name: 'Ether Balance',
              lastNotificationVariableName: '_lastSlackEtherBalanceNotification',
              message: {
                attachments: [{
                  color: 'danger',
                  title: message,
                  fields: [
                    {
                      title: 'Ether balance',
                      value: numberUtil.roundDown(balance, 4) + ' ETH',
                      short: false
                    }, {
                      title: this.name,
                      value: account,
                      short: false
                    }
                  ],
                  footer: this.botInfo
                }]
              }
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

  _notifyLackOfTokens (balanceType, tokenBelowMinimum, accountsDescription, minimumAmounForToken, amountInUsd = true) {
    // Notify which tokens are below the minimum value
    this._lastWarnNotification = new Date()
    const tokenBelowMinimumValue = tokenBelowMinimum.map(balanceInfo => {
      return Object.assign(balanceInfo, {
        amount: balanceInfo.amount.div(1e18).valueOf(),
        amountInUSD: balanceInfo.amountInUSD ? balanceInfo.amountInUSD.valueOf() : undefined
      })
    })

    const message = `The ${balanceType} is below ${amountInUsd ? 'the ' + minimumAmounForToken + 'USD worth of value' : minimumAmounForToken}`
    const tokenNames = tokenBelowMinimum.map(balanceInfo => balanceInfo.token).join(', ')
    let fields = tokenBelowMinimumValue.map(({ token, amount, amountInUSD }) => ({
      title: token,
      value: numberUtil.roundDown(amount, 4) + (amountInUsd ? ' ' + token + ' ($' + amountInUSD + ')' : ''),
      short: false
    }))

    fields = [].concat({
      title: this.name,
      value: accountsDescription,
      short: false
    }, fields)

    // Log message
    logger.warn({
      msg: `[${accountsDescription}] ${message}: ${tokenNames} - ${this.name}`,
      contextData: {
        extra: {
          account: accountsDescription,
          tokenBelowMinimum: tokenBelowMinimumValue
        }
      },
      notify: true
    })

    this._notifications.forEach(({ type, channel }) => {
      switch (type) {
        case 'slack':
          if (this._slackRepo.isEnabled()) {
            // Notify to slack
            this._notifyToSlack({
              channel,
              name: 'Token Balances',
              lastNotificationVariableName: '_lastSlackTokenBalanceNotification',
              message: {
                attachments: [{
                  color: 'danger',
                  title: message,
                  text: 'The tokens below the threshold are:',
                  fields,
                  footer: this.botInfo
                }]
              }
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

  async _notifyToSlack ({ channel, name, lastNotificationVariableName, message }) {
    const now = new Date()
    const lastNotification = this[lastNotificationVariableName]

    let nextNotification
    if (lastNotification) {
      nextNotification = new Date(
        lastNotification.getTime() +
        MINIMUM_TIME_BETWEEN_SLACK_NOTIFICATIONS
      )
    } else {
      nextNotification = now
    }
    if (nextNotification <= now) {
      logger.info('Notifying "%s" to slack', name)
      message.channel = channel

      this._slackRepo
        .postMessage(message)
        .then(() => {
          this[lastNotificationVariableName] = now
        })
        .catch(error => {
          logger.error({
            msg: 'Error notifing lack of ether to Slack: ' + error.toString(),
            error
          })
        })
    } else {
      logger.info(`The slack notifcation for "%s" was sent too soon. Next \
one will be %s`, name, formatUtil.formatDateFromNow(nextNotification))
    }
  }
}

module.exports = BalanceCheckBot
