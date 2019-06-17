const cliUtils = require('../helpers/cliUtils')
const formatUtil = require('../../helpers/formatUtil')
const getDateRangeFromParams = require('../../helpers/getDateRangeFromParams')

const getDxInfoService = require('../../services/DxInfoService')

const HEADERS = `\
Claim date\t\
Buyer/Seller\t\
Sell Token\t\
Buy Token\t\
Auction index\t\
User\t\
Amount\t\
Claimed token\t\
MGN issued\t\
Transaction hash
`

function registerCommand ({ cli, logger }) {
  cli.command(
    'claimings [--account account] [--from-date fromDate --to-date toDate] [--period period]',
    'Get the claimed amounts',
    yargs => {
      cliUtils.addOptionByName({ name: 'from-date', yargs })
      cliUtils.addOptionByName({ name: 'to-date', yargs })
      cliUtils.addOptionByName({ name: 'period', yargs })
      cliUtils.addPositionalByName('account', yargs)

      yargs.option('file', {
        type: 'string',
        describe: 'Allow to specify a file were we can export the trades as CSV'
      })
    }, async function (argv) {
      const {
        fromDate: fromDateStr,
        toDate: toDateStr,
        period,
        account,
        file
      } = argv

      const { fromDate, toDate } = getDateRangeFromParams({
        period, fromDateStr, toDateStr
      })

      const [
        dxInfoService
      ] = await Promise.all([
        getDxInfoService()
      ])

      logger.info('Find %s between %s and %s',
        account ? 'all the clamings for ' + account : 'all clamings',
        formatUtil.formatDateTime(fromDate),
        formatUtil.formatDateTime(toDate)
      )

      dxInfoService.getFees({ account })

      let stream
      if (file) {
        var fs = require('fs')
        stream = fs.createWriteStream(file)
        stream.write(HEADERS)
      }

      // Get claimings
      const claimings = await dxInfoService.getClaimings({
        fromDate, toDate, account
      })

      function printClaimings (isBuyer, claimings) {
        const name = isBuyer ? 'Buyer claimings' : 'Seller claimings'
        if (claimings.length > 0) {
          logger.info(name + ' - total ' + claimings.length)
          claimings.forEach(claiming => {
            printClaiming(claiming, isBuyer, stream, logger)
          })
        } else {
          logger.info('No %s match the criteria.', name.toLowerCase())
        }
      }

      printClaimings(false, claimings.seller)
      printClaimings(true, claimings.buyer)

      if (file) {
        logger.info('The result has been exported to: %s', file)
        // Close file
        stream.end()
      }
    })
}

function printClaiming ({
  claimDate,
  sellToken,
  buyToken,
  auctionIndex,
  user,
  amount,
  frtsIssued,
  transactionHash
}, isBuyer, stream, logger) {
  const dateTimeStr = formatUtil.formatDateTimeCsv(claimDate)
  const sellTokenSymbol = sellToken.symbol
  const buyTokenSymbol = buyToken.symbol
  const claimedToken = isBuyer ? sellToken.symbol : buyToken.symbol

  if (stream) {
    // Write CSV line
    stream.write(`\
${dateTimeStr}\t\
${isBuyer ? 'Buyer' : 'Seller'}\t\
${sellTokenSymbol}\t\
${buyTokenSymbol}\t\
${auctionIndex}\t\
${user}\t\
${amount}\t\
${claimedToken}\t\
${frtsIssued}\t\
${transactionHash}
`)
  } else {
    // Print in log
    logger.info(
      '\t[%s] %s-%s-%d (%s): %d %s. Issued %d MGN. Tx: %s',
      dateTimeStr,
      sellTokenSymbol,
      buyTokenSymbol,
      auctionIndex,
      user,
      amount,
      claimedToken,
      frtsIssued,
      transactionHash
    )
  }
}

module.exports = registerCommand
