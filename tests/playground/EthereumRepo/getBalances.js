const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

async function run ({
  ethereumRepo,
  tokens,
  address
}) {
  Object
    .keys(tokens)
    .map(token => {
      return ethereumRepo
        .tokenBalanceOf({
          tokenAddress: tokens[token].address,
          account: address
        })
        .then(amount => {
          console.log(`Balance for ${token}: ${amount}`)
        })
        .catch(error => {
          console.log(`Error getting balance for ${token}: ${error}`)
          console.error(error)
        })
    })
}
