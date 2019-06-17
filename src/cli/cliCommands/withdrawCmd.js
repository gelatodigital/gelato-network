const cliUtils = require('../helpers/cliUtils')
const { toWei } = require('../../helpers/numberUtil')

const getAddress = require('../../helpers/getAddress')
const getDxTradeService = require('../../services/DxTradeService')
const getDxInfoService = require('../../services/DxInfoService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'withdraw <amount> <token>',
    'Withdraw from the DX account depositing tokens into user account',
    yargs => {
      cliUtils.addPositionalByName('amount', yargs)
      cliUtils.addPositionalByName('token', yargs)
    }, async function (argv) {
      const { amount, token } = argv

      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        accountAddress,
        dxTradeService,
        dxInfoService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getDxTradeService(),
        getDxInfoService()
      ])

      logger.info(`Withdraw %d %s from the DX for %s`,
        amount,
        token,
        accountAddress
      )
      const { decimals } = await dxInfoService.getTokenInfo(token)
      const withdrawResult = await dxTradeService.withdraw({
        token,
        amount: toWei(amount, decimals),
        accountAddress
      })
      logger.info('The withdraw was succesful. Transaction: %s', withdrawResult.tx)
    })
}

module.exports = registerCommand
