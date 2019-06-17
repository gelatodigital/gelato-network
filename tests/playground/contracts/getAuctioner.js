const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

function run ({
  dx
}) {
  return dx.auctioneer
    .call()
    .then(auctioneer => {
      console.log('The auctioner of DX is: ' + auctioneer)
    })
}
