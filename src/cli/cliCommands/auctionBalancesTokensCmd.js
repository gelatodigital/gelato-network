const cliUtils = require('../helpers/cliUtils')

const getAddress = require('../../helpers/getAddress')
const getDxInfoService = require('../../services/DxInfoService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'auction-balances <token-pairs> [count]',
    'Get the balances for the a list of token pair (i.e. claimable-tokens ETH-RDN,ETH-OMG)',
    yargs => {
      cliUtils.addPositionalByName('token-pairs', yargs)
      cliUtils.addPositionalByName('count', yargs)
    }, async function (argv) {
      const { tokenPairs: tokenPairString, count } = argv
      const tokenPairs = cliUtils.toTokenPairs(tokenPairString)

      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        address,
        dxInfoService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getDxInfoService()
      ])

      logger.info('Showing last %d auctions claimable balances for %s:',
        count, address)
      tokenPairs.forEach(async tokenPair => {
        const { sellToken, buyToken } = tokenPair
        const auctionsBalances = await dxInfoService.getAuctionsBalances({
          tokenA: sellToken,
          tokenB: buyToken,
          address,
          count
        })
        auctionsBalances.forEach(({
          sellerBalanceA,
          buyerBalanceA,
          sellerBalanceB,
          buyerBalanceB,
          auctionIndex
        }) => {
          _printBalances({
            auctionIndex,
            sellToken,
            buyToken,
            sellerBalance: sellerBalanceA,
            buyerBalance: buyerBalanceA,
            logger
          })
          _printBalances({
            auctionIndex,
            sellToken: buyToken,
            buyToken: sellToken,
            sellerBalance: sellerBalanceB,
            buyerBalance: buyerBalanceB,
            logger
          })
        })
      })
    })
}

function _printBalances ({
  auctionIndex,
  sellToken,
  buyToken,
  sellerBalance,
  buyerBalance,
  logger
}) {
  logger.info(`\t- %d. %s-%s balances: (%d %s) + (%d %s)`,
    auctionIndex,
    sellToken,
    buyToken,
    sellerBalance ? sellerBalance.div(1e18) : 0,
    sellToken,
    buyerBalance ? buyerBalance.div(1e18) : 0,
    buyToken
  )
}

module.exports = registerCommand
