const cliUtils = require('../helpers/cliUtils')

const getArbitrageService = require('../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'get-price-uniswap [tokenPair]',
    'Get the Uniswap price for the given token pair',
    yargs => {
      cliUtils.addPositionalByName('token', yargs)
      yargs.option('arbitrage-contract', {
        type: 'string',
        describe: 'The arbitrage contract address to use'
      })
    }, async function (argv) {
      const { tokenPair } = argv
      const [ sellToken, buyToken ] = tokenPair.split('-')
      const [
        arbitrageService
      ] = await Promise.all([
        getArbitrageService()
      ])

      logger.info(`Checking price for token %s-%s`, sellToken, buyToken)
      const price =
        await arbitrageService.getPriceUniswap({ sellToken, buyToken })

      logger.info('Price: %s %s/%s', price.toString(10), sellToken, buyToken)
    })
}

module.exports = registerCommand
