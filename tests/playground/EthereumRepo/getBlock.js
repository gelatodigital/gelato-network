const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

async function run ({
  ethereumRepo
}) {
  const blockNumber = process.env.BLOCK || 20
  return ethereumRepo
    .getBlock(blockNumber)
    .then(block => {
      console.log(`Block ${blockNumber}:`)
      Object.keys(block).forEach(key => {
        const value = JSON.stringify(block[key])
        console.log(`\t- ${key}: ${value}`)
      })
    })
    .catch(console.error)
}
