const cliUtils = require('../helpers/cliUtils')

const getAddress = require('../../helpers/getAddress')
const getDxInfoService = require('../../services/DxInfoService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'claimable-tokens <token-pairs> [count] [--acount account]',
    'Get all pending claimable tokens for a list of token pairs',
    yargs => {
      cliUtils.addPositionalByName('token-pairs', yargs)
      cliUtils.addPositionalByName('count', yargs)
      cliUtils.addPositionalByName('account', yargs)
    },
    async function (argv) {
      const { tokenPairs: tokenPairString, account, count } = argv
      const tokenPairs = cliUtils.toTokenPairs(tokenPairString)

      const DEFAULT_ACCOUNT_INDEX = 0
      const [
        botAccount,
        dxInfoService
      ] = await Promise.all([
        getAddress(DEFAULT_ACCOUNT_INDEX),
        getDxInfoService()
      ])

      const accountAddress = account || botAccount

      logger.info('Showing last %d auctions claimable balances for %s:',
        count, accountAddress)

      tokenPairs.forEach(async tokenPair => {
        const { sellToken, buyToken } = tokenPair
        const { sellerClaims, buyerClaims } = await dxInfoService.getClaimableTokens({
          tokenA: sellToken,
          tokenB: buyToken,
          address: accountAddress,
          lastNAuctions: count
        })
        sellerClaims.length > 0
          ? logger.info('Seller claimable tokens for %s-%s:', sellToken, buyToken)
          : logger.info('No seller claimable tokens for %s-%s', sellToken, buyToken)
        sellerClaims.forEach(({ auctionIndex, amount }, index) =>
          _printClaims({
            auctionIndex,
            amount,
            sellToken,
            buyToken
          }, sellToken, logger)
        )

        buyerClaims.length > 0
          ? logger.info('Buyer claimable tokens for %s-%s:', sellToken, buyToken)
          : logger.info('No buyer claimable tokens for %s-%s', sellToken, buyToken)
        buyerClaims.forEach(({ auctionIndex, amount }, index) =>
          _printClaims({
            auctionIndex,
            amount,
            sellToken,
            buyToken
          }, buyToken, logger)
        )
      })
    })
}

function _printClaims ({
  sellToken,
  buyToken,
  auctionIndex,
  amount
}, token, logger) {
  logger.info(`\t- %d. %s-%s: %d %s`,
    auctionIndex,
    sellToken,
    buyToken,
    amount.div(1e18),
    token
  )
}

module.exports = registerCommand
