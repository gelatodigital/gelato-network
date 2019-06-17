const cliUtils = require('../helpers/cliUtils')

const getAddress = require('../../helpers/getAddress')
const getDxTradeService = require('../../services/DxTradeService')

function registerCommand ({ cli, logger }) {
  cli.command('claim-seller <token-pair> [auction-index]', 'Claim tokens as seller in an auction', yargs => {
    cliUtils.addPositionalByName('token-pair', yargs)
    cliUtils.addPositionalByName('auction-index', yargs)
  }, async function (argv) {
    const { tokenPair, auctionIndex } = argv

    const DEFAULT_ACCOUNT_INDEX = 0
    const [
      botAccount,
      dxTradeService
    ] = await Promise.all([
      getAddress(DEFAULT_ACCOUNT_INDEX),
      getDxTradeService()
    ])

    logger.info('Claiming tokens as seller for %s in auction %d:',
      botAccount, auctionIndex)
    const [ tokenA, tokenB ] = tokenPair.split('-')
    const claimResult = await dxTradeService.claimSellerFunds({
      tokenA, tokenB, address: botAccount, auctionIndex
    })

    logger.info('The claim was succesful. Transaction: %s', claimResult.tx)
  })
}

module.exports = registerCommand
