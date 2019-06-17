const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

function run ({
  auctionRepo,
  address
}) {
  const token = 'WETH'
  return auctionRepo
    .getBalance({ token, address })
    .then(balance => {
      console.log(`The balance of the account ${address} in ${token} is ${balance}`)
    })
    .catch(console.error)
}
