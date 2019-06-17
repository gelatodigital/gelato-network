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
    .getFees({
      fromBlock: 0,
      toBlock = -5,
      user: account
    })
    .then(claimedFunds => {
      claimedFunds.forEach(({ sellToken, buyToken, user, auctionIndex, fee }) => {
        console.log(`\nFee:\n`, {
          sellToken: sellToken.valueOf(),
          buyToken: buyToken.valueOf(),
          user: user.valueOf(),
          auctionIndex: auctionIndex.valueOf(),
          fee: fee.valueOf()
        })
      })
    })
    .catch(console.error)
}
