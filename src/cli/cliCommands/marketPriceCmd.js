const cliUtils = require('../helpers/cliUtils')

const getMarketService = require('../../services/MarketService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'market-price <token-pair>',
    'Get the market price for a token pair',
    yargs => {
      cliUtils.addPositionalByName('token-pair', yargs)
    }, async function (argv) {
      const { tokenPair } = argv
      const [ sellToken, buyToken ] = tokenPair.split('-')

      const marketService = await getMarketService()

      logger.info(`Get market price for the token pair ${sellToken}-${buyToken}`)

      const price = await marketService.getPrice({
        tokenA: sellToken,
        tokenB: buyToken
      })
      logger.info('The market price is: %d %s/%s', price, sellToken, buyToken)
    })
}

module.exports = registerCommand
