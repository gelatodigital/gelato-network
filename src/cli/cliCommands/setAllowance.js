const cliUtils = require('../helpers/cliUtils')
const { toWei } = require('../../helpers/numberUtil')

const getDxTradeService = require('../../services/DxTradeService')
const getDxInfoService = require('../../services/DxInfoService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'set-allowance <account> <token> <amount>',
    'Set the allowance for the DutchX for a given user and token',
    yargs => {
      cliUtils.addPositionalByName('account', yargs)
      cliUtils.addPositionalByName('token', yargs)
      cliUtils.addPositionalByName('amount', yargs)
    }, async function (argv) {
      const { account: accountAddress, token, amount } = argv

      const dxTradeService = await getDxTradeService()
      const dxInfoService = await getDxInfoService()

      logger.info(`Set the DutchX allowance to:
  Account: %s
  Token: %s
  Amount: %d`,
      accountAddress,
      token,
      amount
      )

      const { decimals } = await dxInfoService.getTokenInfo(token)

      const transactionResult = await dxTradeService.setAllowance({
        token,
        accountAddress,
        amount: toWei(amount, decimals)
      })

      logger.info({
        msg: 'Approved the DX to use %d %s on behalf of the user. Transaction: %s',
        params: [ amount, token, transactionResult.tx ]
      })
    })
}

module.exports = registerCommand
