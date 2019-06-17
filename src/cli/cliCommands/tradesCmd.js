const cliUtils = require('../helpers/cliUtils')
const getDateRangeFromParams = require('../../helpers/getDateRangeFromParams')
const formatUtil = require('../../helpers/formatUtil')
// const numberUtil = require('../../helpers/numberUtil')

const getDxInfoService = require('../../services/DxInfoService')

const HEADERS = `\
Trade date\t\
Operation\t\
Sell token\t\
Buy token\t\
Auction index\t\
User\t\
Nonce\t\
Amount\t\
Trade token\t\
Gas limit\t\
Gas price (GWei)\t\
Gas used\t\
Gas cost\t\
Gas cost (USD)\t\
Transaction hash\t\
Block hash\t\
Block number
`

function registerCommand ({ cli, logger }) {
  cli.command(
    'trades',
    'Get all the operations performed in a time period. It requires either the params "from-date" and "to-date" or the "period" param',
    yargs => {
      cliUtils.addOptionByName({ name: 'from-date', yargs })
      cliUtils.addOptionByName({ name: 'to-date', yargs })
      cliUtils.addOptionByName({ name: 'period', yargs })

      yargs.option('token', {
        type: 'string',
        describe: 'The token symbol or address that is being bought or sold, i.e. RDN'
      })
      yargs.option('type', {
        type: 'string',
        describe: 'trade type. Can be "bid" or "ask"'
      })
      cliUtils.addOptionByName({ name: 'sell-token', yargs })
      cliUtils.addOptionByName({ name: 'buy-token', yargs })
      cliUtils.addOptionByName({ name: 'auction-index', yargs })
      cliUtils.addOptionByName({ name: 'account', yargs })

      yargs.option('file', {
        type: 'string',
        describe: 'Allow to specify a file were we can export the trades as CSV'
      })
    }, async function (argv) {
      const {
        fromDate: fromDateStr,
        toDate: toDateStr,
        period,
        token,
        type,
        sellToken,
        buyToken,
        auctionIndex,
        account,
        file
      } = argv

      // TODO: This command, is use for early testing, but it will be shaped into
      // a command that would allow to filter by dates, addresse, token, ..
      // Right now it filters by the bot address and use the defined time period
      const dxInfoService = await getDxInfoService()

      const { fromDate, toDate } = getDateRangeFromParams({
        period, fromDateStr, toDateStr
      })

      logger.info('Find all trades, between %s and %s',
        formatUtil.formatDateTime(fromDate),
        formatUtil.formatDateTime(toDate)
      )

      let aditionalFilter = false
      if (type) {
        aditionalFilter = true
        logger.info('\t Filter by type: %s', type)
      }
      if (account) {
        aditionalFilter = true
        logger.info('\t Filter by account: %s', account)
      }
      if (token) {
        aditionalFilter = true
        logger.info('\t Filter by token: %s', token)
      }
      if (sellToken) {
        aditionalFilter = true
        logger.info('\t Filter by sellToken: %s', sellToken)
      }
      if (buyToken) {
        aditionalFilter = true
        logger.info('\t Filter by buyToken: %s', buyToken)
      }
      if (auctionIndex) {
        aditionalFilter = true
        logger.info('\t Filter by auctionIndex: %s', auctionIndex)
      }

      if (!aditionalFilter) {
        logger.info('\t Not aditional filters were applied')
      }

      let stream
      if (file) {
        var fs = require('fs')
        stream = fs.createWriteStream(file)
        stream.write(HEADERS)
      }

      const operations = await dxInfoService.getTrades({
        fromDate,
        toDate,
        type,
        account,
        token,
        sellToken,
        buyToken,
        auctionIndex
      })
      if (operations.length > 0) {
        logger.info('Found %d matching trades:', operations.length)
        operations.forEach(operation => {
          _printOperation(operation, stream, logger)
        })
      } else {
        logger.info('There are no trades that matches the search criteria.')
      }

      if (file) {
        logger.info('The result has been exported to: %s', file)
        // Close file
        stream.end()
      }
    })
}

function _printOperation ({
  type,
  auctionIndex,
  sellToken,
  buyToken,
  user,
  amount,
  dateTime,
  transactionHash,
  gasLimit,
  gasPriceGwei,
  gasUsed,
  gasCost,
  gasCostInUsd,
  nonce,
  blockHash,
  blockNumber
}, stream, logger) {
  const dateTimeStr = formatUtil.formatDateTimeCsv(dateTime)
  if (stream) {
    // Write CSV line
    stream.write(`\
${dateTimeStr}\t\
${type}\t\
${sellToken.symbol}\t\
${buyToken.symbol}\t\
${auctionIndex}\t\
${user}\t\
${nonce}\t\
${amount.div(1e18)}\t\
${type === 'ask' ? sellToken.symbol : buyToken.symbol}\t\
${gasLimit}\t\
${gasPriceGwei}\t\
${gasUsed}\t\
${gasCost}\t\
${gasCostInUsd}\t\
${transactionHash}\t\
${blockHash}\t\
${blockNumber}
`)
  } else {
    // Print in log
    logger.info(`\t${sellToken.symbol}-${buyToken.symbol}-${auctionIndex}: ${user} ${type} ${amount.div(1e18)} at ${dateTimeStr}. Cost: $${gasCostInUsd} Tx: ${transactionHash}`)
  }
}

module.exports = registerCommand
