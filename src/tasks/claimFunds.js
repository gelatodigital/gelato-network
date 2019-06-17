const loggerNamespace = 'dx-service:tasks:claimFunds'
const Logger = require('../helpers/Logger')
const logger = new Logger(loggerNamespace)
const assert = require('assert')

const config = require('../../conf/')
const getDxTradeService = require('../services/DxTradeService')
const BotRunner = require('../BotRunner')

// Helpers
const gracefullShutdown = require('../helpers/gracefullShutdown')

// Env
logger.info('Claiming funds')

async function claimFunds () {
  const { BOTS, ENVIRONMENT } = config

  const botRunner = new BotRunner({
    bots: BOTS,
    environment: ENVIRONMENT,
    runApiServer: false,
    initBots: false
  })

  // Create instances of all configured bots
  await botRunner.init()
  const allBots = botRunner._bots

  // Filter bots by BOT_TYPE
  let bots = allBots.filter(({ type }) => {
    return type === 'BuyLiquidityBot' || type === 'SellLiquidityBot'
  })

  // Init bots accounts
  bots = await Promise.all(bots.map(async bot => {
    await bot.setAddress()
    return bot
  }))

  // List markets grouped by account
  const marketsByAccount = bots.reduce((accountMarkets, bot) => {
    return _getAccountMarkets(accountMarkets, bot)
  }, {})

  const accounts = Object.keys(marketsByAccount)

  const claimingPromises = accounts.map(botAddress => {
    return _doClaim({
      // data
      botAddress,
      markets: marketsByAccount[botAddress].markets,
      name: marketsByAccount[botAddress].name,
      // config
      config
    })
  })

  return Promise.all(claimingPromises)
}

const _doClaim = async ({ botAddress, markets, name, config }) => {
  const dxTradeService = await getDxTradeService()

  // Execute the claim
  logger.info('Claiming for address %s affected bots: %s', botAddress, name)

  return dxTradeService.claimAll({
    tokenPairs: markets,
    address: botAddress,
    lastNAuctions: config.AUTO_CLAIM_AUCTIONS
  }).then(result => {
    const {
      claimAmounts,
      claimSellerTransactionResult,
      claimBuyerTransactionResult
    } = result

    logger.info('Claimed for address %s. Result: %o', botAddress, claimAmounts)
    if (claimSellerTransactionResult) {
      logger.info('Claim as seller transaction: %s', claimSellerTransactionResult.tx)
    }
    if (claimBuyerTransactionResult) {
      logger.info('Claim as buyer transaction: %s', claimBuyerTransactionResult.tx)
    }
  })
}

// List markets grouped by account
function _getAccountMarkets (accountMarkets, bot) {
  const name = bot.name
  const markets = bot._markets
  const botAddress = bot.getAddress()
  assert(botAddress, 'The bot address was not configured. Define the PK or MNEMONIC environment var')

  // First time we see this account
  if (!accountMarkets.hasOwnProperty(botAddress)) {
    accountMarkets[botAddress] = {
      name: name,
      markets: []
    }
  } else {
    accountMarkets[botAddress].name += ', ' + name
  }

  function _isEqualTokenPair (tokenPair, { sellToken, buyToken }) {
    return tokenPair.sellToken === sellToken && tokenPair.buyToken === buyToken
  }

  markets.forEach(({ tokenA, tokenB }) => {
    // Check if market already used with this account in another bot
    if (!accountMarkets[botAddress].markets.some(market =>
      _isEqualTokenPair(market, { sellToken: tokenA, buyToken: tokenB }))
    ) {
      accountMarkets[botAddress].markets.push({
        sellToken: tokenA, buyToken: tokenB
      })
    }
    if (!accountMarkets[botAddress].markets.some(market =>
      _isEqualTokenPair(market, { sellToken: tokenB, buyToken: tokenA }))
    ) {
      accountMarkets[botAddress].markets.push({
        sellToken: tokenB, buyToken: tokenA
      })
    }
  })

  return accountMarkets
}

function handleError (error) {
  process.exitCode = 1
  logger.error({
    msg: 'Error booting the application: ' + error.toString(),
    error
  })
}

// Run app
claimFunds()
  .then(() => gracefullShutdown.shutDown())
  .catch(error => {
    // Handle boot errors
    handleError(error)

    // Shutdown app
    return gracefullShutdown.shutDown()
  })
