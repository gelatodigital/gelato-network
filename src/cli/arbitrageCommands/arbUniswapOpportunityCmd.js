const cliUtils = require('../helpers/cliUtils')
const { toWei } = require('../../helpers/numberUtil')

const getAddress = require('../../helpers/getAddress')
const getArbitrageContractAddress = require('../helpers/getArbitrageContractAddress')
const getArbitrageService = require('../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'uniswap-opportunity <token> <amount> [--arbitrage-contract address]',
    'Execute a Uniswap Opportunity transaction with Arbitrage contract',
    yargs => {
      cliUtils.addPositionalByName('token', yargs)
      cliUtils.addPositionalByName('amount', yargs)
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

      logger.info(`Arbitrage %d ETH on Uniswap for token %s using the account %s`,
        amount, token, from
      )

      const uniswapResult = await arbitrageService.uniswapOpportunity({
        arbToken: token,
        amount: toWei(amount),
        from,
        arbitrageContractAddress
      })
      logger.info('The uniswapOpportunity was successful. Transaction: %s', uniswapResult.tx)
    })
}

module.exports = registerCommand
