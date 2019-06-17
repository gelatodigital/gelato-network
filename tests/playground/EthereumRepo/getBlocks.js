const testSetup = require('../../helpers/testSetup')
const formatUtil = require('../../../src/helpers/formatUtil')
testSetup()
  .then(run)
  .catch(console.error)

async function run ({
  ethereumRepo
}) {
  const fromBlock = process.env.FROM || 0
  const toBlock = process.env.TO || 81
  const blockPromises = []
  for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber++) {
    const blockPromise = ethereumRepo
      .getBlock(blockNumber)
      .then(block => {
        return {
          number: blockNumber,
          date: block ? new Date(block.timestamp * 1000) : null
        }
      })
    blockPromises.push(blockPromise)
  }

  const blocks = await Promise.all(blockPromises)
  const blocksString = blocks.map(block => {
    return `${block.number};${formatUtil.formatDateTimeWithSeconds(block.date)}`
  }).join('\n')
  console.log(blocksString)
}
