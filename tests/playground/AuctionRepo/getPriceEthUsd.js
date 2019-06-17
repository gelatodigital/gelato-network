const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

function run ({
  auctionRepo,
  address
}) {
  return auctionRepo
    .getPriceEthUsd()
    .then(price => {
      console.log(`Price: ${price} USD/ETH`)
    })
    .catch(console.error)
}
