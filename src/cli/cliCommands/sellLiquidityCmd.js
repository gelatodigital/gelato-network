const cliUtils = require('../helpers/cliUtils')
const { fromWei } = require('../../helpers/numberUtil')

const getAddress = require('../../helpers/getAddress')
const getLiquidityService = require('../../services/LiquidityService')
const getDxInfoService = require('../../services/DxInfoService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'sell-liquidity <token-pair>',
    'Ensure the sell liquidity for a token pair',
    yargs => {
      cliUtils.addPositionalByName('token-pair', yargs)
    }, async function (argv) {
      const { tokenPair } = argv
      const [ sellToken, buyToken ] = tokenPair.split('-')
      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        address,
        liquidityService,
        dxInfoService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getLiquidityService(),
        getDxInfoService()
      ])

      logger.info(`Ensure the SELL liquidity for ${sellToken}-${buyToken}`)
      const soldTokens = await liquidityService.ensureSellLiquidity({
        sellToken,
        buyToken,
        from: address
      })

      const { decimals } = await dxInfoService.getTokenInfo(sellToken)

      if (soldTokens.length > 0) {
        soldTokens.forEach(sellOrder => {
          // The bot sold some tokens
          logger.info({
            sellToken,
            buyToken,
            msg: "I've sold %d %s (%d USD) to ensure liquidity",
            params: [
              fromWei(sellOrder.amount, decimals),
              sellOrder.sellToken,
              sellOrder.amountInUSD
            ]
          })
        })
      } else {
        // The bot didn't have to do anything
        logger.info({
          msg: 'There\'s no need to ensure sell liquidity'
        })
      }
    })
}

module.exports = registerCommand
