const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

function run ({
  auctionRepo,
  address
}) {
  return auctionRepo
    .getBalances({ address })
    .then(balances => {
      console.log(`The balance for account ${address} is:`)
      balances.forEach(balanceInfo => {
        console.log(`\t${balanceInfo.token}: ${balanceInfo.amount}`)
      })
    })
    .catch(console.error)
}
