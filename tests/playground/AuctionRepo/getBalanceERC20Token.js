const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

async function run ({
  auctionRepo,
  address
}) {
  const tokens = await auctionRepo.getTokens()
  console.log(`Balance for ERC20 Tokens:`)
  const balancePromises = tokens.map(token => {
    return auctionRepo
      .getBalanceERC20Token({ token, address })
      .then(amount => ({ token, amount }))
      .catch(console.error)
  })
  const balances = await Promise.all(balancePromises)
  balances.forEach(balance => console.log(`\t- ${balance.token}: ${balance.amount}`))
}
