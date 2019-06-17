const cliUtils = require('../helpers/cliUtils')

const getAddress = require('../../helpers/getAddress')
const getDxTradeService = require('../../services/DxTradeService')

function registerCommand ({ cli, logger }) {
  cli.command('claim-buyer <token-pair> [auction-index]', 'Claim tokens as buyer in an auction', yargs => {
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

    logger.info('Claiming tokens as buyer for %s in auction %d:',
      botAccount, auctionIndex)
    const [ tokenA, tokenB ] = tokenPair.split('-')
    const claimResult = await dxTradeService.claimBuyerFunds({
      tokenA, tokenB, address: botAccount, auctionIndex
    })

    logger.info('The claim was succesful. Transaction: %s', claimResult.tx)
  })
}

module.exports = registerCommand
