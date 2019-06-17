const cliUtils = require('../helpers/cliUtils')

const getDxInfoService = require('../../services/DxInfoService')

function registerCommand ({ cli, logger }) {
  cli.command('closing-prices <token-pair>', 'Get the closing prices for a given pair (i.e. WETH-RDN)', yargs => {
    cliUtils.addPositionalByName('token-pair', yargs)
    yargs.option('from', {
      type: 'integer',
      describe: 'Starting auction index'
    })

    yargs.option('count', {
      type: 'integer',
      describe: 'Number of auctions to return'
    })

    yargs.option('auction-index', {
      type: 'integer',
      describe: 'Return just one specific auction index'
    })
  }, async function (argv) {
    const {
      tokenPair: tokenPairString,
      count: countParam,
      from,
      auctionIndex
    } = argv
    const [sellToken, buyToken] = tokenPairString.split('-')

    const dxInfoService = await getDxInfoService()

    // Get data
    const countDefault = countParam || 5
    let fromAuction, count, reverseResult
    if (from !== undefined) {
      count = countDefault
      fromAuction = from
      reverseResult = false
      logger.info('Get closing prices for auctions between %d and %d of %s:',
        fromAuction,
        fromAuction + count - 1
      )
    } else if (auctionIndex !== undefined) {
      count = 1
      fromAuction = auctionIndex
      reverseResult = false
      logger.info('Get the closing price for %s-%d:',
        tokenPairString,
        auctionIndex
      )
    } else {
      const currentAuctionIndex = await dxInfoService.getAuctionIndex({
        sellToken,
        buyToken
      })
      count = countDefault
      fromAuction = (currentAuctionIndex - count) > 0 ? currentAuctionIndex - count + 1 : 0
      reverseResult = true
      logger.info('Get last %d closing prices for %s:', count, tokenPairString)
    }

    let lastClosingPrices = await dxInfoService.getClosingPrices({
      sellToken,
      buyToken,
      fromAuction,
      count
    })

    if (reverseResult) {
      lastClosingPrices = lastClosingPrices.reverse()
    }

    if (lastClosingPrices.length) {
      logger.info('Found %d closing prices:', lastClosingPrices.length)
      lastClosingPrices.forEach(({ auctionIndex, price, priceIncrement }, i) => {
        let priceIncrementStr
        if (priceIncrement) {
          if (priceIncrement.greaterThan(0)) {
            const value = priceIncrement.toFixed(2)
            priceIncrementStr = `: +${value}%`
          } else {
            const value = priceIncrement.toFixed(2)
            priceIncrementStr = `: ${value}%`
          }
        } else {
          priceIncrementStr = ''
        }

        logger.info(
          '\t%d. %s%s',
          auctionIndex,
          price,
          priceIncrementStr
        )
      })
    } else {
      logger.info('No closing prices were found')
    }
  })
}

module.exports = registerCommand
