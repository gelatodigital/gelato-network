const cliUtils = require('../helpers/cliUtils')
const { toWei } = require('../../helpers/numberUtil')

const getAddress = require('../../helpers/getAddress')
const getDxInfoService = require('../../services/DxInfoService')
const getDxTradeService = require('../../services/DxTradeService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'buy <amount> <token-pair>',
    'Buy in a auction for a token pair',
    yargs => {
      cliUtils.addPositionalByName('amount', yargs)
      cliUtils.addPositionalByName('token-pair', yargs)
    }, async function (argv) {
      const { amount, tokenPair } = argv
      const [ sellToken, buyToken ] = tokenPair.split('-')
      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        from,
        dxInfoService,
        dxTradeService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getDxInfoService(),
        getDxTradeService()
      ])

      // Get auction index
      const auctionIndex = await dxInfoService.getAuctionIndex({
        sellToken, buyToken
      })

      logger.info(`Buy ${sellToken} using %d %s on ${sellToken}-${buyToken} (%s) using the account %s`,
        amount,
        buyToken,
        'auction ' + auctionIndex,
        from
      )

      const { decimals } = await dxInfoService.getTokenInfo(buyToken)

      const buyResult = await dxTradeService.buy({
        sellToken,
        buyToken,
        auctionIndex,
        amount: toWei(amount, decimals),
        from
      })
      logger.info('The buy was succesful. Transaction: %s', buyResult.tx)
    })
}

module.exports = registerCommand
