const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

function run ({
  auctionRepo
}) {
  return auctionRepo
    .getClearedAuctions()
    .then(auctions => {
      auctions.forEach(({ sellToken, buyToken, sellVolume, buyVolume, auctionIndex }) => {
        console.log(`\nAuction Cleared:\n`, {
          sellToken: sellToken.valueOf(),
          buyToken: buyToken.valueOf(),
          sellVolume: sellVolume.valueOf(),
          buyVolume: buyVolume.valueOf(),
          auctionIndex: auctionIndex.valueOf()
        })
      })
    })
    .catch(console.error)
}
