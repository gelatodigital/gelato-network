const testSetup = require('../../helpers/testSetup')
const formatUtil = require('../../../src/helpers/formatUtil')

testSetup()
  .then(run)
  .catch(console.error)

function run ({
  auctionRepo
}) {
  /*
  2.272.823,
  2.282.210

  2.277.833
  */
  const auctionIndex = process.env.INDEX ? parseInt(process.env.INDEX) : undefined
  const fromBlock = process.env.FROM ? parseInt(process.env.INDEX) : undefined
  const toBlock = process.env.TO ? parseInt(process.env.INDEX) : undefined

  return auctionRepo
    .getAuctionStartScheduledEvents({
      auctionIndex,
      fromBlock,
      toBlock
    })
    .then(auctions => {
      auctions.forEach(({ ethInfo, sellToken, buyToken, auctionIndex, auctionStart, auctionStartScheduled }) => {
        console.log(`\n[block %d] Auction %s-%s-%d scheduled on %s. Start time: %s\n`,
          ethInfo.blockNumber,
          sellToken.valueOf(),
          buyToken.valueOf(),
          auctionIndex.toNumber(),
          formatUtil.formatDateTime(auctionStartScheduled),
          formatUtil.formatDateTime(auctionStart)
        )
      })
    })
    .catch(console.error)
}
