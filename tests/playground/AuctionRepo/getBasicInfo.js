const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

function run ({
  auctionRepo
}) {
  return auctionRepo
    .getAbout()
    .then(console.log)
    .catch(console.error)
}
