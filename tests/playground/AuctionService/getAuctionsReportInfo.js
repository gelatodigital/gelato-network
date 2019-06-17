const testSetup = require('../../helpers/testSetup')
const getDateRangeFromParams = require('../../../src/helpers/getDateRangeFromParams')

testSetup()
  .then(run)
  .catch(console.error)

async function run ({
  auctionService,
  ethereumClient
}) {
  const fromDateStr = process.env.FROM
  const toDateStr = process.env.TO
  const period = process.env.PERIOD || 'today'

  const sellToken = process.env.SELL_TOKEN || 'WETH'
  const buyToken = process.env.BUY_TOKEN || 'RDN'

  const { fromDate, toDate } = getDateRangeFromParams({
    fromDateStr, toDateStr, period
  })

  return auctionService
    .getAuctionsReportInfo({
      period,
      fromDate,
      toDate,
      sellToken,
      buyToken
    })
    .then(auctions => {
      console.log('Got %d auctions:', auctions.length)
      auctions.forEach(auction => {
        console.log(JSON.stringify(auction))
      })
    })
    .catch(console.error)
}
