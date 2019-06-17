const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

function run ({
  dx,
  tokens
}) {
  console.log('DutchExchange: ', dx.address)
  Object.keys(tokens).forEach(token => {
    console.log('Token %s: ', token, tokens[token].address)
  })
}
