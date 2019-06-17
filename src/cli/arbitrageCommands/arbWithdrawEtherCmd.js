
const cliUtils = require('../helpers/cliUtils')
const { toWei } = require('../../helpers/numberUtil')

const getAddress = require('../../helpers/getAddress')
const getArbitrageContractAddress = require('../helpers/getArbitrageContractAddress')
const getArbitrageService = require('../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'withdraw-ether <amount> [--arbitrage-contract address]',
    'Withdraw WETH from DutchX and convert to ETH',
    yargs => {
      cliUtils.addPositionalByName('amount', yargs)
      yargs.option('arbitrage-contract', {
        type: 'string',
        describe: 'The arbitrage contract address to use'
      })
    }, async function (argv) {
      const { amount, arbitrageContract } = argv
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

      logger.info(`Transfer %d WETH from DutchX and convert to ETH`,
        amount
      )
      const withdrawTransfer = await arbitrageService.withdrawEther({
        amount: toWei(amount),
        from,
        arbitrageContractAddress
      })
      logger.info('The withdrawEther tx was successful. Transaction: %s', withdrawTransfer.tx)
    })
}

module.exports = registerCommand
