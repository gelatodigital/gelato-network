const testSetup = require('../../helpers/testSetup')
const assert = require('assert')
testSetup()
  .then(run)
  .catch(console.error)

function run({
  auctionRepo
}) {
  const account = process.env.ACCOUNT
  assert(account, '"account" is mandatory')

  return auctionRepo
    .getClaimedFundsBuyer({
      fromBlock: 0,
      toBlock = -5,
      user: account
    })
    .then(claimedFunds => {
      claimedFunds.forEach(({ sellToken, buyToken, user, amount, auctionIndex, frtsIssued }) => {
        console.log(`\nClaimed amount:\n`, {
          sellToken: sellToken.valueOf(),
          buyToken: buyToken.valueOf(),
          user: user.valueOf(),
          amount: amount.valueOf(),
          auctionIndex: auctionIndex.valueOf(),
          frtsIssued: frtsIssued.valueOf()
        })
      })
    })
    .catch(console.error)
}
