const cliUtils = require('../helpers/cliUtils')
const { toWei } = require('../../helpers/numberUtil')

const getAddress = require('../../helpers/getAddress')
const getDxInfoService = require('../../services/DxInfoService')
const getDxTradeService = require('../../services/DxTradeService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'sell <amount> <token-pair> <account>',
    'Sell in a auction for a token pair',
    yargs => {
      cliUtils.addPositionalByName('amount', yargs)
      cliUtils.addPositionalByName('token-pair', yargs)
      cliUtils.addPositionalByName('account', yargs)
    }, async function (argv) {
      const { amount, account, tokenPair } = argv
      const [ sellToken, buyToken ] = tokenPair.split('-')
      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        address,
        dxInfoService,
        dxTradeService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getDxInfoService(),
        getDxTradeService()
      ])

      // Get auction index
      let auctionIndex
      const [ auctionIndexCurrent, state ] = await Promise.all([
        dxInfoService.getAuctionIndex({ sellToken, buyToken }),
        dxInfoService.getState({ sellToken, buyToken })
      ])

      if (state === 'WAITING_FOR_FUNDING' || state === 'WAITING_FOR_AUCTION_TO_START') {
        // If we are in a waiting period
        auctionIndex = auctionIndexCurrent
      } else {
        // If the prior auction is not cleared yet
        auctionIndex = auctionIndexCurrent + 1
      }

      logger.info(`Sell %d %s on ${sellToken}-${buyToken} (%s) using the account %s`,
        amount,
        sellToken,
        'auction ' + auctionIndex,
        account
      )
      const { decimals } = await dxInfoService.getTokenInfo(sellToken)

      const buyResult = await dxTradeService.sell({
        sellToken,
        buyToken,
        auctionIndex,
        amount: toWei(amount, decimals),
        from: account
      })
      logger.info('The sell was succesful. Transaction: %s', buyResult.tx)
    })
}

module.exports = registerCommand
