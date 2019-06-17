const cliUtils = require('../helpers/cliUtils')
const { toWei } = require('../../helpers/numberUtil')

const getAddress = require('../../helpers/getAddress')
const getArbitrageContractAddress = require('../helpers/getArbitrageContractAddress')
const getArbitrageService = require('../../services/ArbitrageService')
const getDxInfoService = require('../../services/DxInfoService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'approve-owl <amount> [--arbitrage-contract address]',
    'Approve OWL amount to be used by the arbitrage contract',
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
        arbitrageService,
        dxInfoService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getArbitrageContractAddress(),
        getArbitrageService(),
        getDxInfoService()
      ])

      let arbitrageContractAddress = arbitrageContract
      if (!arbitrageContract) {
        arbitrageContractAddress = confArbitrageContractAddress
      }

      const owlAddress = await dxInfoService.getTokenAddress('OWL')

      logger.info(`Approve to use %d OWL (%s) in contract %s using the account %s`,
        amount, owlAddress, arbitrageContractAddress, from
      )
      const depositResult = await arbitrageService.approveToken({
        token: owlAddress,
        allowance: toWei(amount),
        from,
        arbitrageContractAddress
      })
      logger.info('The approval was successful. Transaction: %s', depositResult.tx)
    })
}

module.exports = registerCommand
