
const cliUtils = require('../helpers/cliUtils')
const { toWei } = require('../../helpers/numberUtil')

const getAddress = require('../../helpers/getAddress')
const getArbitrageContractAddress = require('../helpers/getArbitrageContractAddress')
const getArbitrageService = require('../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'withdraw-token <amount> <token> [--arbitrage-contract address]',
    'Withdraw token from DutchX',
    yargs => {
      cliUtils.addPositionalByName('amount', yargs)
      cliUtils.addPositionalByName('token', yargs)
      yargs.option('arbitrage-contract', {
        type: 'string',
        describe: 'The arbitrage contract address to use'
      })
    }, async function (argv) {
      const { amount, token, arbitrageContract } = argv
      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        from,
        confArbitrageContractAddress,
        arbitrageService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getArbitrageContractAddress(),
        getArbitrageService()
      ])

      let arbitrageContractAddress = arbitrageContract
      if (!arbitrageContract) {
        arbitrageContractAddress = confArbitrageContractAddress
      }

      logger.info(`Withdraw %d token (%s) from DutchX `,
        amount, token
      )
      const withdrawTransfer = await arbitrageService.withdrawToken({
        amount: toWei(amount),
        token,
        from,
        arbitrageContractAddress
      })
      logger.info('The withdrawToken tx was successful. Transaction: %s', withdrawTransfer.tx)
    })
}

module.exports = registerCommand
