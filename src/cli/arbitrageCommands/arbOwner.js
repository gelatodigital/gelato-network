const cliUtils = require('../helpers/cliUtils')

const getAddress = require('../../helpers/getAddress')
const getArbitrageContractAddress = require('../helpers/getArbitrageContractAddress')
const getArbitrageService = require('../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'owner [--arbitrage-contract address]',
    'Get the owner of the arbitrage contract',
    yargs => {
      cliUtils.addPositionalByName('token', yargs)
      yargs.option('arbitrage-contract', {
        type: 'string',
        describe: 'The arbitrage contract address to use'
      })
    }, async function (argv) {
      const {arbitrageContract} = argv
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
      
      const owner = await arbitrageService.owner(arbitrageContractAddress)

        logger.info(`Owner of arbitrage contract is ${owner}`)
    })
}

module.exports = registerCommand
