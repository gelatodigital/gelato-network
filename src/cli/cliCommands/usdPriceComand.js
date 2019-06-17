const cliUtils = require('../helpers/cliUtils')
const { round, toWei } = require('../../helpers/numberUtil')

const getDxInfoService = require('../../services/DxInfoService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'usd-price <amount> <token>',
    'Get the price of the specified amounts of a token in USD',
    yargs => {
      cliUtils.addPositionalByName('amount', yargs)
      cliUtils.addPositionalByName('token', yargs)
    }, async function (argv) {
      const { token, amount } = argv
      const dxInfoService = await getDxInfoService()

      logger.info(`Get the price of ${amount} ${token} in USD`)

      const { decimals } = await dxInfoService.getTokenInfo(token)

      const price = await dxInfoService.getPriceInUSD({
        token,
        amount: toWei(amount, decimals)
      })
      logger.info('The current price is: %s %s/USD',
        round(price),
        token
      )
    })
}

module.exports = registerCommand
