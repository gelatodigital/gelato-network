const loggerNamespace = 'dx-service:bots:WatchEventsBot'
const Logger = require('../helpers/Logger')
const logger = new Logger(loggerNamespace)
const AuctionLogger = require('../helpers/AuctionLogger')
const auctionLogger = new AuctionLogger(loggerNamespace)

const BOT_TYPE = 'WatchEventsBot'
const assert = require('assert')

const Bot = require('./Bot')
const ethereumEventHelper = require('../helpers/ethereumEventHelper')
const events = require('../helpers/events')
const formatUtil = require('../helpers/formatUtil')
const loadContracts = require('../loadContracts')
const getEventBus = require('../getEventBus')

let instanceAlreadyCreated = false

const RETRY_WATCH_EVENTS_MILLISECONDS = 4 * 1000
/**
 * Bot responsible of watching the auction events and notifying the eventBus.
 *
 * This bot centralize the event watching, so it's easier and more efficient for
 * other bots to subscribe to the relevant events just by using the event bus.
 */
class WatchEventsBot extends Bot {
  constructor ({
    name,
    markets
  }) {
    super(name, BOT_TYPE)
    assert(!instanceAlreadyCreated, 'There can be only one instance of WatchEventsBot')
    instanceAlreadyCreated = true

    this._markets = markets
    this._knownMarkets = this._markets.map(formatUtil.formatMarketDescriptor)
    this._watchingFilter = null
  }

  async _doInit () {
    const [ contracts, eventBus ] = await Promise.all([
      loadContracts(),
      getEventBus()
    ])
    this._eventBus = eventBus
    this._contracts = contracts
    this._tokenContracts = {
      ...contracts.erc20TokenContracts,
      WETH: contracts.eth,
      MGN: contracts.mgn,
      OWL: contracts.owl,
      GNO: contracts.gno
    }

    const tokenNames = Object.keys(this._tokenContracts)
    this._tokenNamesByAddress = tokenNames.reduce((tokenNamesByAddress, tokenName) => {
      const address = this._tokenContracts[tokenName].address
      tokenNamesByAddress[address] = tokenName
      return tokenNamesByAddress
    }, {})
  }

  async start () {
    this._doWatch()
  }

  async _doStop () {
    logger.info({ msg: 'Stopping the auction watch...' })
    await this._watchingFilter.stopWatching()
    this._watchingFilter = null
    if (this._eventBus) {
      this._eventBus.clearAllListeners()
    }
    logger.info({ msg: 'Stopped watching for events' })
  }

  _doWatch () {
    logger.info({
      msg: 'Start to follow the markets [%s]...',
      params: [ this._knownMarkets.join(', ') ]
    })
    const that = this
    try {
      this._watchingFilter = ethereumEventHelper.watch({
        contract: this._contracts.dx,
        fromBlock: 'latest',
        toBlock: 'latest',
        callback (error, eventData) {
          that._handleEvent(error, eventData)
        }
        //, events: EVENTS_TO_LISTEN
      })
    } catch (error) {
      logger.error({
        msg: 'Error watching events: ' + error.toString(),
        error
      })

      if (this._watchingFilter !== null) {
        // If there was a watchingFilter, means that we were watching
        // succesfully for events, but somthing happend (i.e. we lost connection)
        //  * In this case we retry in some seconds
        logger.error({
          msg: 'Error watching events: ' + error.toString(),
          error
        })

        if (this._watchingFilter) {
          try {
            this._watchingFilter.stopWatching()
              .catch(console.error)
          } catch (errorStoppingWatch) {
            logger.error({
              msg: `Error when trying stop watching events (handling an \
error watching the blockchain): ` + errorStoppingWatch.toString(),
              error: errorStoppingWatch
            })
          }
        }

        this._watchingFilter = null
        logger.error({
          msg: 'Retrying to connect in %d seconds',
          params: [ RETRY_WATCH_EVENTS_MILLISECONDS / 1000 ]
        })
        setTimeout(() => {
          this._doWatch()
        }, RETRY_WATCH_EVENTS_MILLISECONDS)
      } else {
        // If we don't have a watchingFilter, means that the first watch failed
        //  * In this case we rethrow the error (so the app won't boot)
        throw error
      }
    }
  }

  _handleEvent (error, eventData) {
    logger.debug({
      msg: 'Got event %s - %o',
      params: [ eventData.event, eventData ]
    })
    if (error) {
      logger.error({
        msg: 'Error watching events: ' + error.toString(),
        error
      })
    } else {
      switch (eventData.event) {
        case 'AuctionCleared':
          this._onAuctionCleared(eventData)
          break
        default:
      }
    }
  }

  _onAuctionCleared (eventData) {
    const { sellToken, buyToken, sellVolume, buyVolume, auctionIndex } = eventData.args
    const tokenA = this._tokenNamesByAddress[sellToken]
    const tokenB = this._tokenNamesByAddress[buyToken]

    let tokensAreKnown, market
    if (tokenA && tokenB) {
      market = formatUtil.formatMarketDescriptor({ tokenA, tokenB })
      tokensAreKnown = this._knownMarkets.includes(market)
    } else {
      tokensAreKnown = false
    }

    // Check if the cleared auction is of a known market
    if (tokensAreKnown) {
      auctionLogger.info({
        sellToken: tokenA,
        buyToken: tokenB,
        msg: 'The auction has cleared'
      })
      this._eventBus.trigger(events.EVENT_AUCTION_CLEARED, {
        sellToken: tokenA,
        buyToken: tokenB,
        sellVolume,
        buyVolume,
        auctionIndex: auctionIndex.toNumber()
      })
    } else {
      auctionLogger.warn({
        sellToken,
        buyToken,
        msg: 'One auction cleared, but it was for an unknown pair: %s-%s',
        params: [ sellToken, buyToken ]
      })
    }
  }

  async getInfo () {
    return {
      markets: this._markets,
      knownMarkets: this._knownMarkets,
      watchingFilter: this._watchingFilter,
      notifications: this._notifications,
      checkTimeInMilliseconds: this._checkTimeInMilliseconds
    }
  }
}

module.exports = WatchEventsBot
