// const cliUtils = require('../../helpers/cliUtils')

const getAddress = require('../../helpers/getAddress')
const getArbitrageService = require('../../services/ArbitrageService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'transfer-ownership <arbitrage-address> <new-owner-address>',
    'Transfer ownership of the Arbitrage contract',
    yargs => {
      yargs.positional('arbitrage-address', {
        type: 'string',
        describe: 'The arbitrage contract address to use'
      })
      yargs.positional('new-owner-address', {
        type: 'string',
        describe: 'New contract owner address'
      })
    }, async function (argv) {
      const { newOwnerAddress: newOwner, arbitrageAddress } = argv
      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        from,
        arbitrageService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getArbitrageService()
      ])

      logger.info(`Transfer ownership of contract %s to %s from the account %s`,
        arbitrageAddress, newOwner, from
      )
      const transferOwnership = await arbitrageService.transferOwnership({
        newOwner,
        arbitrageAddress,
        from
      })
      logger.info('The transferOwnership tx was succesful. Transaction: %s', transferOwnership.tx)
    })
}

module.exports = registerCommand
