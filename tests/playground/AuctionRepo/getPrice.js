const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

function run ({
  auctionRepo,
  address
}) {
  const sellToken = 'RDN'
  const buyToken = 'WETH'
  const auctionIndex = 0
  return auctionRepo
    .getCurrentAuctionPrice({ sellToken, buyToken, auctionIndex })
    .then(price => {
      console.log(`The price for auction ${auctionIndex} of ${sellToken}-${buyToken} pair is ${price.numerator}/${price.denominator}`)
    })
    .catch(console.error)
}
