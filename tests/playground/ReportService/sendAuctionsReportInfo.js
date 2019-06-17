const testSetup = require('../../helpers/testSetup')
const getDateRangeFromParams = require('../../../src/helpers/getDateRangeFromParams')
const formatUtil = require('../../../src/helpers/formatUtil')
const getBotAddress = require('../../../src/helpers/getBotAddress')

testSetup()
  .then(run)
  .catch(console.error)

async function run ({
  reportService,
  ethereumClient
}) {
  const fromDateStr = process.env.FROM
  const toDateStr = process.env.TO
  const period = process.env.PERIOD || 'today'
  const botAddress = await getBotAddress(ethereumClient)

  const { fromDate, toDate } = getDateRangeFromParams({
    fromDateStr, toDateStr, period
  })

  return reportService
    .sendAuctionsReportToSlack({
      fromDate,
      toDate,
      account: botAddress
    })
    .then(receipt => {
      console.log('Receipt id:', receipt.id)
    })
    .catch(console.error)
}
