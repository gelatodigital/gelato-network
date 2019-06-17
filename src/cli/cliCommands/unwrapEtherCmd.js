const cliUtils = require('../helpers/cliUtils')
const { toWei } = require('../../helpers/numberUtil')

const getAddress = require('../../helpers/getAddress')
const getDxTradeService = require('../../services/DxTradeService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'unwrap <amount>',
    'Unwrap WETH to get ETH in user account',
    yargs => {
      cliUtils.addPositionalByName('amount', yargs)
    }, async function (argv) {
      const { amount } = argv

      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        address,
        dxTradeService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getDxTradeService()
      ])

      logger.info(`Unwrap %d WETH into %s`,
        amount,
        address
      )

      const withdrawEtherResult = await dxTradeService.withdrawEther({
        amount: toWei(amount),
        accountAddress: address
      })
      logger.info('The unwrap was succesful. Transaction: %s', withdrawEtherResult.tx)
    })
}

module.exports = registerCommand
