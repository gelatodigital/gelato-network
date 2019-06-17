const cliUtils = require('../helpers/cliUtils')
const { fromWei } = require('../../helpers/numberUtil')

const getDxTradeService = require('../../services/DxTradeService')
const getDxInfoService = require('../../services/DxInfoService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'get-allowance <account> <token>',
    'Get the allowance for the DutchX for a given user and token',
    yargs => {
      cliUtils.addPositionalByName('account', yargs)
      cliUtils.addPositionalByName('token', yargs)
    }, async function (argv) {
      const { account: accountAddress, token } = argv
      const dxTradeService = await getDxTradeService()
      const dxInfoService = await getDxInfoService()

      logger.info(`Get the DutchX allowance of:
  Account: %s
  Token: %s`,
      accountAddress,
      token
      )

      const { decimals } = await dxInfoService.getTokenInfo(token)

      const allowance = await dxTradeService.getAllowance({
        token,
        accountAddress
      })

      logger.info('Allowance: %s', fromWei(allowance, decimals).toNumber())
    })
}

module.exports = registerCommand
