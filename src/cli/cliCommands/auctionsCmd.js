const cliUtils = require('../helpers/cliUtils')
const getDateRangeFromParams = require('../../helpers/getDateRangeFromParams')
const formatUtil = require('../../helpers/formatUtil')

const getReportService = require('../../services/ReportService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'auctions',
    'Get all the auctions cleared in a time period. It requires either the params "from-date" and "to-date" or the "period" param',
    yargs => {
      cliUtils.addOptionByName({ name: 'from-date', yargs })
      cliUtils.addOptionByName({ name: 'to-date', yargs })
      cliUtils.addOptionByName({ name: 'period', yargs })
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
        account,
        file
      } = argv

      // TODO: This command, is use for early testing, but it will be shaped into
      // a command that would allow to filter by dates, addresse, token, ..
      // Right now it filters by the bot address and use the defined time period
      const reportService = await getReportService()

      const { fromDate, toDate } = getDateRangeFromParams({
        period, fromDateStr, toDateStr
      })

      logger.info('Find all auctions, between %s and %s',
        formatUtil.formatDateTime(fromDate),
        formatUtil.formatDateTime(toDate)
      )

      const fileInfo = await reportService.getAuctionsReportFile({
        fromDate,
        toDate,
        account
      })
      const { content } = fileInfo

      if (file) {
        logger.info('Write result into: ' + file)
        const fs = require('fs')
        const fileWriteStream = fs.createWriteStream(file)
        content.pipe(fileWriteStream)
      } else {
        content.pipe(process.stdout)
      }
    })
}

module.exports = registerCommand
