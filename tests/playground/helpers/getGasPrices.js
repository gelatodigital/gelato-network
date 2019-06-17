const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

async function run ({ ethereumClient }) {
  const gasPrices = await ethereumClient.getGasPricesGWei()
  console.log(
    `GasPrices (safeLow: %d, average: %d, fast: %d):\n`,
    gasPrices.safeLow.toNumber(),
    gasPrices.average.toNumber(),
    gasPrices.fast.toNumber()
  )
}
