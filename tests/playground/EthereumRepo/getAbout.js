const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

async function run ({ ethereumRepo }) {
  const about = await ethereumRepo.getAbout()
  console.log(`About:\n`, about)
}
