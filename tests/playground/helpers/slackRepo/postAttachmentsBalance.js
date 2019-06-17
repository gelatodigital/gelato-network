const getSlackRepo = require('../../../../src/repositories/SlackRepo')

// https://api.slack.com/docs/messages/builder
/* eslint quotes: 0 */
const message = {
  "text": "The bot account has a balance below the threshold",
  "attachments": [
    {
      "title": "Review the bot balance",
      "fallback": "The bot account has tokens below the $5000 worth of value",
      "color": "danger",
      "author_name": "BalanceCheckBot",
      "text": "The bot account has tokens below the $5000 worth of value:",
      "fields": [
        {
          "title": "WETH",
          "value": "2.13 WETH ($1.252)",
          "short": false
        }, {
          "title": "RDN",
          "value": "1658 RDN ($2.719,12)",
          "short": false
        }
      ],
      "footer": "DutchX Bots - v1.0",
      "ts": 123456789
    }, {
      "color": "danger",
      "title": "The bot account is running out of Ether",
      "text": "0.1345 WETH"
    }, {
      "color": "good",
      "title": "This tokens should be OK",
      "text": "The tokens above the threshold are:",
      "fields": [
        {
          "title": "OMG",
          "value": "575 OMG ($7.538,25)",
          "short": false
        }
      ]
    }
  ]
}

async function run () {
  const slackRepo = await getSlackRepo()

  message.channel = 'GA5J9F13J'
  const res = await slackRepo.postMessage(message)
  // `res` contains information about the posted message
  console.log('Message sent: ', res.ts)
}

run().catch(console.error)
