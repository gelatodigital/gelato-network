const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

function run ({
  auctionRepo
}) {
  return auctionRepo
    .getSellOrders()
    .then(orders => {
      orders.forEach(({ sellTokenSymbol, sellToken, buyToken, buyTokenSymbol, user, amount, auctionIndex }) => {
        console.log(`\nOrder:\n`, {
          sellTokenSymbol,
          sellToken: sellToken.valueOf(),
          buyTokenSymbol,
          buyToken: buyToken.valueOf(),
          user: user.valueOf(),
          amount: amount.valueOf(),
          auctionIndex: auctionIndex.valueOf()
        })
      })
    })
    .catch(console.error)
}