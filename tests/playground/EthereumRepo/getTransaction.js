const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

async function run ({
  ethereumRepo
}) {
  const transactionHash = process.env.HASH || '0xd90dbbb1b192d3bfc6e4f8b5caf2a75257bca101b20225f5ccb07ccacffe882e'
  return ethereumRepo
    .getTransaction(transactionHash)
    .then(receip => {
      console.log(`Block ${transactionHash}:`)
      Object.keys(receip).forEach(key => {
        const value = JSON.stringify(receip[key])
        console.log(`\t- ${key}: ${value}`)
      })
    })
    .catch(console.error)
}
