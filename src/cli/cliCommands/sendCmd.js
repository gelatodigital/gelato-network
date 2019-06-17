const cliUtils = require('../helpers/cliUtils')
const { toWei } = require('../../helpers/numberUtil')

const getAddress = require('../../helpers/getAddress')
const getDxTradeService = require('../../services/DxTradeService')
const getDxInfoService = require('../../services/DxInfoService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'send <amount> <token> <account>',
    'Send tokens to another account',
    yargs => {
      cliUtils.addPositionalByName('amount', yargs)
      cliUtils.addPositionalByName('token', yargs)
      cliUtils.addPositionalByName('account', yargs)
    }, async function (argv) {
      const { amount, token, account } = argv
      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        owner,
        dxTradeService,
        dxInfoService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getDxTradeService(),
        getDxInfoService()
      ])

      logger.info(`Send %d %s from %s to %s`,
        amount,
        token,
        owner,
        account
      )

      const { decimals } = await dxInfoService.getTokenInfo(token)

      const sendTokensResult = await dxTradeService.sendTokens({
        token,
        amount: toWei(amount, decimals),
        fromAddress: owner,
        toAddress: account
      })
      logger.info('The delivery was succesful. Transaction: %s', sendTokensResult.tx)
    })
}

module.exports = registerCommand
