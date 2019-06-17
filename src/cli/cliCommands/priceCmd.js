const cliUtils = require('../helpers/cliUtils')

const getDxInfoService = require('../../services/DxInfoService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'price <token-pair>',
    'Get the current price for a token pair',
    yargs => {
      cliUtils.addPositionalByName('token-pair', yargs)
    }, async function (argv) {
      const { tokenPair } = argv
      const [ sellToken, buyToken ] = tokenPair.split('-')

      const dxInfoService = await getDxInfoService()

      logger.info(`Get market price for the token pair ${sellToken}-${buyToken}`)

      const price = await dxInfoService.getCurrentPrice({
        sellToken,
        buyToken
      })
      logger.info('The current price is: %s %s/%s',
        (price !== null ? price : 'N/A'),
        sellToken,
        buyToken
      )
    })
}

module.exports = registerCommand
