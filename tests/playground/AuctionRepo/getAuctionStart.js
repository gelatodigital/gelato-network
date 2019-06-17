const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

function run ({
  auctionRepo
}) {
  const tokenPair = 'WETH-RDN' || process.env.TOKEN_PAIR
  const [ sellToken, buyToken ] = tokenPair.split('-')
  const auctionIndex = 1
  return auctionRepo
    .getAuctionStart({
      sellToken,
      buyToken,
      auctionIndex
    })
    .then(console.log)
    .catch(console.error)
}
