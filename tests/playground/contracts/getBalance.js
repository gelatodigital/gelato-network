const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

function run ({
  address,
  dx,
  tokens
}) {
  const eth = tokens.WETH
  return dx
    .balances
    .call(eth.address, address)
    .then(balance => {
      console.log(`The balance of the account ${address} in EtherToken (${eth.address}) is ${balance}`)
    })
}
