const cliUtils = require('../helpers/cliUtils')
const formatUtil = require('../../helpers/formatUtil')
const getDateRangeFromParams = require('../../helpers/getDateRangeFromParams')

const getDxInfoService = require('../../services/DxInfoService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'liquidity-contribution [--account account] [--from-date fromDate --to-date toDate] [--period period]',
    'Get the liquidity contribution applied on the trades',
    yargs => {
      cliUtils.addOptionByName({ name: 'from-date', yargs })
      cliUtils.addOptionByName({ name: 'to-date', yargs })
      cliUtils.addOptionByName({ name: 'period', yargs })
      cliUtils.addPositionalByName('account', yargs)
    }, async function (argv) {
      const {
        fromDate: fromDateStr,
        toDate: toDateStr,
        period,
        account
      } = argv

      const { fromDate, toDate } = getDateRangeFromParams({
        period, fromDateStr, toDateStr
      })

      const dxInfoService = await getDxInfoService()

      logger.info('Find %s between %s and %s',
        account ? 'all the liquidity contribution for ' + account : 'all liquidity contributions',
        formatUtil.formatDateTime(fromDate),
        formatUtil.formatDateTime(toDate)
      )

      dxInfoService.getFees({ account })

      // Get liquidity contributions
      const fees = await dxInfoService.getFees({
        fromDate, toDate, account
      })

      if (fees.length > 0) {
        // console.log(JSON.stringify(fees, null, 2))
        fees.forEach(({ tradeDate, sellToken, buyToken, user, auctionIndex, fee, transactionHash }) => {
          logger.info(
            '[%s] %s-%s-%d (%s): %d %s. Tx: %s',
            formatUtil.formatDateTime(tradeDate),
            sellToken.symbol,
            buyToken.symbol,
            auctionIndex,
            user,
            fee,
            sellToken.symbol,
            transactionHash
          )
        })
      } else {
        logger.info('No liquidity contributions match the criteria.')
      }
    })
}

module.exports = registerCommand
