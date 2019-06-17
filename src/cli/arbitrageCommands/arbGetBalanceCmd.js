const cliUtils = require('../helpers/cliUtils')

const getArbitrageContractAddress = require('../helpers/getArbitrageContractAddress')
const getArbitrageService = require('../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'get-balance [token] [--arbitrage-contract address]',
    'Get the arbitrage contract balance of any token (blank token for Ether)',
    yargs => {
      cliUtils.addPositionalByName('token', yargs)
      yargs.option('arbitrage-contract', {
        type: 'string',
        describe: 'The arbitrage contract address to use'
      })
    }, async function (argv) {
      const { token, arbitrageContract } = argv
      const [
        confArbitrageContractAddress,
        arbitrageService
      ] = await Promise.all([
        getArbitrageContractAddress(),
        getArbitrageService()
      ])

      let arbitrageContractAddress = arbitrageContract
      if (!arbitrageContract) {
        arbitrageContractAddress = confArbitrageContractAddress
      }

      logger.info(`Checking balance of %s contract as well as on the DutchX`,
        arbitrageContractAddress)
      const { contractBalance, dutchBalance } =
        await arbitrageService.getBalance({ token, arbitrageContractAddress })

      logger.info('Contract: %s', contractBalance.toString(10))
      logger.info('DutchX: %s', dutchBalance.toString(10))
    })
}

module.exports = registerCommand
