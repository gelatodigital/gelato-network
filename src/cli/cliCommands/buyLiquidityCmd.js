const cliUtils = require('../helpers/cliUtils')
const { fromWei } = require('../../helpers/numberUtil')

const getAddress = require('../../helpers/getAddress')
const getLiquidityService = require('../../services/LiquidityService')
const getDxInfoService = require('../../services/DxInfoService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'buy-liquidity <token-pair>',
    'Ensure the buy liquidity for a token pair',
    yargs => {
      cliUtils.addPositionalByName('token-pair', yargs)
    }, async function (argv) {
      const { tokenPair } = argv
      const [ sellToken, buyToken ] = tokenPair.split('-')
      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        botAccount,
        liquidityService,
        dxInfoService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getLiquidityService(),
        getDxInfoService()
      ])

      logger.info(`Ensure the BUY liquidity for ${sellToken}-${buyToken}`)
      const boughtTokens = await liquidityService.ensureBuyLiquidity({
        sellToken,
        buyToken,
        from: botAccount
      })

      const { decimals } = await dxInfoService.getTokenInfo(buyToken)

      if (boughtTokens.length > 0) {
        boughtTokens.forEach(buyOrder => {
          // The bot sold some tokens
          logger.info({
            sellToken,
            buyToken,
            msg: "I've bought %d %s (%d USD) to ensure liquidity",
            params: [
              fromWei(buyOrder.amount, decimals),
              buyOrder.buyToken,
              buyOrder.amountInUSD
            ]
          })
        })
      } else {
        // The bot didn't have to do anything
        logger.info({
          msg: 'There\'s no need to ensure buy liquidity'
        })
      }
    })
}

module.exports = registerCommand
