const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

function run ({
  liquidityService
}) {
  return liquidityService
    .getAbout()
    .then(console.log)
}
