const getSlackRepo = require('../../../../src/repositories/SlackRepo')

const _printChannels = require('./_printChannels')
const showEmptyChannels = false

async function run () {
  const slackRepo = await getSlackRepo()

  const { channels } = await slackRepo.getChannels()
  const filteredChannels = channels.filter(({ num_members: numMembers }) => {
    return numMembers > 0 || showEmptyChannels
  })
  _printChannels(filteredChannels)
}

run().catch(console.error)
