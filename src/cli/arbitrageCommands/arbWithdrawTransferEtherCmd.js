const cliUtils = require('../helpers/cliUtils')
const { toWei } = require('../../helpers/numberUtil')

const getAddress = require('../../helpers/getAddress')
const getArbitrageContractAddress = require('../helpers/getArbitrageContractAddress')
const getArbitrageService = require('../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'withdraw-transfer-ether <amount> [--arbitrage-contract address]',
    'Withdraw WETH from DutchX, convert to ETH and transfer to owner address',
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

      logger.info(`Withdraw %d WETH from DutchX, convert to ETH and transfer to owner account %s`,
        amount, from
      )
      const withdrawTransfer = await arbitrageService.withdrawEtherThenTransfer({
        amount: toWei(amount),
        from,
        arbitrageContractAddress
      })
      logger.info('The withdrawEtherThenTransfer tx was successful. Transaction: %s', withdrawTransfer.tx)
    })
}

module.exports = registerCommand
