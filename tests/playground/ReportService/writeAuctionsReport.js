const testSetup = require('../../helpers/testSetup')
const getDateRangeFromParams = require('../../../src/helpers/getDateRangeFromParams')
const getBotAddress = require('../../../src/helpers/getBotAddress')

const fs = require('fs')

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
  const fileName = process.env.FILE

  return reportService
    .getAuctionsReportFile({
      fromDate,
      toDate,
      account: botAddress
    })
    .then(({ name, mimeType, content }) => {
      console.log('Generated file: "%s"', name)
      console.log('Mime type: "%s"', mimeType)
      if (fileName) {
        console.log('Write result into: ' + fileName)
        const fileWriteStream = fs.createWriteStream(fileName)
        content.pipe(fileWriteStream)
      } else {
        console.log('Content:')
        content.pipe(process.stdout)
      }
    })
    .catch(console.error)
}
