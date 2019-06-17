const getSlackRepo = require('../../../../src/repositories/SlackRepo')

const _printChannels = require('./_printChannels')
const showEmptyChannels = false

async function run () {
  const slackRepo = await getSlackRepo()
  const { groups } = await slackRepo.getPrivateChannels()
  const channels = groups.filter(({ num_members: numMembers }) => {
    return numMembers > 0 || showEmptyChannels
  })
  _printChannels(channels)
}

run().catch(console.error)
