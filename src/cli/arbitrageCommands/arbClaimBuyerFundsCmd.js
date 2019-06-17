const cliUtils = require('../helpers/cliUtils')

const getAddress = require('../../helpers/getAddress')
const getArbitrageContractAddress = require('../helpers/getArbitrageContractAddress')
const getArbitrageService = require('../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'claim-buyer-funds <token> <auction-index> [--arbitrage-contract address]',
    'Claim buyer funds from an auction on the DutchX',
    yargs => {
      cliUtils.addPositionalByName('token', yargs)
      cliUtils.addPositionalByName('auction-index', yargs)
      yargs.option('arbitrage-contract', {
        type: 'string',
        describe: 'The arbitrage contract address to use'
      })
    }, async function (argv) {
      const { token, auctionIndex, arbitrageContract } = argv
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

      logger.info(`Claim buyer funds of token %s on the DutchX for auction %d`,
        token,
        auctionIndex
      )
      const claimBuyerFunds = await arbitrageService.claimBuyerFunds({
        token,
        auctionIndex,
        from,
        arbitrageContractAddress
      })
      logger.info('The claimBuyerFunds tx was succesful. Transaction: %s', claimBuyerFunds.tx)
    })
}

module.exports = registerCommand
