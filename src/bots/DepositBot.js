const loggerNamespace = 'dx-service:bots:DepositBot'
const Bot = require('./Bot')
const Logger = require('../helpers/Logger')
const logger = new Logger(loggerNamespace)
const assert = require('assert')

const numberUtil = require('../helpers/numberUtil')
const dateUtil = require('../helpers/dateUtil')

const BOT_TYPE = 'DepositBot'
const getEthereumClient = require('../helpers/ethereumClient')
const getDxInfoService = require('../services/DxInfoService')
const getDxTradeService = require('../services/DxTradeService')
const getSlackRepo = require('../repositories/SlackRepo')

const ETHER_RESERVE_AMOUNT =
  process.env.ETHER_RESERVE_AMOUNT || 1.5
const DEPOSIT_PERIODIC_CHECK_MILLISECONDS =
  process.env.DEPOSIT_BOT_CHECK_TIME_MS || (5 * 60 * 1000) // 5 min

class DepositBot extends Bot {
  constructor ({
    name,
    botAddress,
    accountIndex,
    tokens,
    notifications,
    checkTimeInMilliseconds = DEPOSIT_PERIODIC_CHECK_MILLISECONDS,
    inactivityPeriods = [],
    etherReserveAmount = ETHER_RESERVE_AMOUNT
  }) {
    super(name, BOT_TYPE)
    assert(tokens, 'tokens is required')
    assert(notifications, 'notifications is required')
    assert(checkTimeInMilliseconds, 'checkTimeInMilliseconds is required')
    assert(inactivityPeriods, 'inactivityPeriods are required')

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

    this._tokens = tokens
    this._notifications = notifications
    this._checkTimeInMilliseconds = checkTimeInMilliseconds
    this._inactivityPeriods = inactivityPeriods
    this._etherReserveAmount = etherReserveAmount

    this._lastCheck = null
    this._lastDeposit = null
    this._lastError = null
  }

  async _doInit () {
    logger.debug('Init Deposit Bot: ' + this.name)
    const [
      ethereumClient,
      dxInfoService,
      dxTradeService,
      slackRepo
    ] = await Promise.all([
      getEthereumClient(),
      getDxInfoService(),
      getDxTradeService(),
      getSlackRepo()
    ])
    this._ethereumClient = ethereumClient
    this._dxInfoService = dxInfoService
    this._dxTradeService = dxTradeService
    this._slackRepo = slackRepo

    // Get bot address
    await this.setAddress()
  }

  async _doStart () {
    logger.debug({ msg: 'Initialized bot: ' + this.name })

    // Check if the bots need to deposit periodically
    this._depositFunds()
    setInterval(() => {
      return this._depositFunds()
    }, this._checkTimeInMilliseconds)
  }

  async _doStop () {
    logger.debug({ msg: 'Bot stopped: ' + this.name })
  }

  async _getTokenBalances (account) {
    // Prepare balances promises
    // Get ETH balance
    const balanceOfEtherPromise = this._dxInfoService.getBalanceOfEther({
      account
    })

    // Get balance of ERC20 tokens
    const balanceOfTokensPromise = this._dxInfoService.getAccountBalancesForTokensNotDeposited({
      tokens: this._tokens,
      account
    })

    // Execute balances promises
    const [balanceOfEther, balanceOfTokens] = await Promise.all([
      balanceOfEtherPromise,
      balanceOfTokensPromise
    ])

    logger.debug('Balances of ether: %s', balanceOfEther)
    logger.debug('Balances of tokens: %O', balanceOfTokens.map(({ token, amount }) => `${token}: ${amount}`).join(', '))

    return [balanceOfEther, balanceOfTokens]
  }

  async _depositFunds () {
    this._lastCheck = new Date()
    // Check if we are in an inactive period
    const isWaitingTime = this._inactivityPeriods.some(({ from, to }) => {
      return dateUtil.isNowBetweenPeriod(from, to, 'HH:mm')
    })

    if (isWaitingTime) {
      // We stop deposit funds execution
      logger.debug('We are at an inactive time lapse, claim your funds now')
    } else {
      return this._doDepositFunds()
    }
  }

  async _doDepositFunds () {
    try {
      const account = this._botAddress

      const [balanceOfEther, balanceOfTokens] = await this._getTokenBalances(
        account)

      // Deposit ETH
      //  If there is Ether over the RESERVE_AMOUNT, we do a deposit
      const depositEtherPromise = this._depositTokensIfBalance({
        token: 'ETH',
        amount: balanceOfEther,
        accountAddress: account,
        threshold: this._etherReserveAmount
      })

      // Deposit TOKENS
      //  If there is any ERC20 token not deposited, we do a deposit
      const depositTokensPromises = balanceOfTokens.map(({ amount, token }) => {
        return this._depositTokensIfBalance({
          token,
          amount,
          accountAddress: account,
          threshold: 0
        })
      })

      const depositedAmounts = await Promise.all(depositTokensPromises.concat(depositEtherPromise))
      return depositedAmounts.some(amount => amount !== 0)
    } catch (error) {
      this.lastError = new Date()
      logger.error({
        msg: 'There was an error trying to automaticaly deposit %s',
        params: [error],
        error
      })
    }
  }

  // Function to check and handle token depositing
  async _depositTokensIfBalance ({
    token,
    amount,
    accountAddress,
    threshold
  }) {
    let tokenDecimals
    if (token !== 'ETH') {
      const tokenInfo = await this._dxInfoService.getTokenInfo(token)
      tokenDecimals = tokenInfo.decimals
    } else {
      tokenDecimals = 18
    }

    const weiReserveAmount = numberUtil.toWei(threshold, tokenDecimals)
    logger.debug('Wei reserve amount for token %s: %s', token, weiReserveAmount)
    if (amount.greaterThan(weiReserveAmount)) {
      // We have tokens to deposit
      const amountToDeposit = amount.minus(weiReserveAmount)
      const tokenToDeposit = token === 'ETH' ? 'WETH' : token
      logger.info('I have to deposit %d %s for account %s',
        numberUtil.fromWei(amountToDeposit, tokenDecimals),
        token,
        accountAddress
      )

      return this._dxTradeService
        .deposit({
          token: tokenToDeposit,
          amount: amountToDeposit,
          accountAddress
        })
        .then(result => {
          // Notify deposited token
          this._notifyDepositedTokens(amount, token, accountAddress, tokenDecimals)
          return amount
        })
        .catch(error => {
          this._handleError(token, accountAddress, error)
          return 0
        })
    } else {
      logger.debug('No %s tokens to deposit for account: %s', token, accountAddress)
      return 0
    }
  }

  _notifyDepositedTokens (amount, token, account, tokenDecimals) {
    const balance = numberUtil.fromWei(amount, tokenDecimals).valueOf()
    const depositedTokensString = balance + ' ' + token

    const message = 'The bot deposited ' + depositedTokensString + ' into the DutchX'

    // Log message
    logger.info({
      msg: message,
      contextData: {
        extra: {
          balanceOfTokens: balance,
          account
        }
      },
      notify: true
    })

    this._notifications.forEach(({ type, channel }) => {
      switch (type) {
        case 'slack':
          // Notify to slack
          if (this._slackRepo.isEnabled()) {
            this._notifyDepositedTokensSlack({
              channel,
              account,
              depositedTokensString
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

  _notifyDepositedTokensSlack ({ channel, account, depositedTokensString }) {
    this._slackRepo
      .postMessage({
        channel,
        attachments: [
          {
            color: 'good',
            title: 'The bot has deposited ' + depositedTokensString,
            text: 'The bot has deposited tokens into the DutchX.',
            fields: [
              {
                title: 'Bot name',
                value: this.name,
                short: false
              }, {
                title: 'Bot account',
                value: account,
                short: false
              }, {
                title: 'Deposited tokens',
                value: depositedTokensString,
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

  _handleError (token, account, error) {
    // Log message
    logger.error({
      msg: 'There was an error depositing %s with the account %s',
      params: [token, account],
      error
    })
  }

  async getInfo () {
    return {
      botAddress: this._botAddress,
      tokens: this._tokens,
      inactivityPeriods: this._inactivityPeriods,
      lastCheck: this._lastCheck,
      lastDeposit: this._lastDeposit,
      lastError: this._lastError,
      notifications: this._notifications,
      checkTimeInMilliseconds: this._checkTimeInMilliseconds
    }
  }
}

module.exports = DepositBot
