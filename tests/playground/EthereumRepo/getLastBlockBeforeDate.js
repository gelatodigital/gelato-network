const testSetup = require('../../helpers/testSetup')
const formatUtil = require('../../../src/helpers/formatUtil')
testSetup()
  .then(run)
  .catch(console.error)

async function run ({
  ethereumRepo
}) {
  let date = process.env.DATE // i.e. DATE="2017-10-26 14:18:58"
  if (!date) {
    const blockNumber = 20
    const block = await ethereumRepo.getBlock(blockNumber)
    date = new Date(block.timestamp * 1000)
  } else {
    date = formatUtil.parseDateIso(date)
  }

  return ethereumRepo
    .getLastBlockBeforeDate(date)
    .then(block => {
      console.log(`block: ${block}`)
    })
    .catch(console.error)
}
