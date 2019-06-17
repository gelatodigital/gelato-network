const getSlackRepo = require('../../../../src/repositories/SlackRepo')

// https://api.slack.com/docs/messages/builder

async function run () {
  const slackRepo = await getSlackRepo()
  const { ts } = await slackRepo.postMessage({
    as_user: false,
    username: 'magnolio',
    channel: 'GA5J9F13J',
    text: 'Hi, this is Magnolio, how are you doing? :)'
  })
  console.log('Message sent: ', ts)
}

run().catch(console.error)
