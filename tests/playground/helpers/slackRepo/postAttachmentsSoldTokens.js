const getSlackRepo = require('../../../../src/repositories/SlackRepo')

// https://api.slack.com/docs/messages/builder
/* eslint quotes: 0 */
const message = {
  "text": "The bot has sold 120 RDN",
  "attachments": [
    {
      "color": "good",
      "author_name": "SellLiquidityBot",
      "text": "The bot has sold tokens to ensure the sell liquidity.",
      "fields": [
        {
          "title": "Token pair",
          "value": "WETH-RDN",
          "short": false
        }, {
          "title": "Auction index",
          "value": 43,
          "short": false
        }, {
          "title": "Sold tokens",
          "value": "120 RDN",
          "short": false
        }, {
          "title": "USD worth",
          "value": "$950",
          "short": false
        }
      ],
      "footer": "DutchX Bots - v1.0",
      "ts": 123456789
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
