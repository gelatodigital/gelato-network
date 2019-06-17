const getSlackRepo = require('../../../../src/repositories/SlackRepo')

// https://api.slack.com/docs/messages/builder
const fs = require('fs')
// http://slackapi.github.io/node-slack-sdk/web_api
/* eslint quotes: 0 */
const message = {
  "text": "Check out what the bot's been doing lately",
  "attachments": [
    {
      "title": "New report avaliable",
      "color": "good",
      "text": "There's a new report for the last auctions of DutchX",
      "fields": [
        {
          "title": "From:",
          "value": "16/04/18",
          "short": false
        }, {
          "title": "To:",
          "value": "23/04/18",
          "short": false
        }
      ],
      "footer": "DutchX Bots - v1.0",
      "ts": 123456789
    }
  ]
}

message.channel = 'GA5J9F13J'

// const file = fs.createReadStream(`./test-file.csv`)
// slackRepo
//   .uploadFile({
//     fileName: 'Last-auctions-report.csv',
//     file
//   })
//   .then(({ file }) => {
//     console.log('File uploaded: ', file.id)

//     return slackRepo.shareFile({ fileId: file.id })
//   })
//   .then(({ file }) => {
//     console.log('File download Url: ', file.url_download)
//   })
//   .catch(console.error)

async function run () {
  const slackRepo = await getSlackRepo()

  const file = fs.createReadStream(`./test-file.csv`)
  const { file: uploadedFile } = await slackRepo.uploadFile({
    fileName: 'Last-auctions-report.csv',
    file,
    channels: 'GA5J9F13J'
  })
  console.log('File uploaded: ', uploadedFile.id)
  console.log('Url private: ', uploadedFile.url_private)

  message.attachments[0].fields.push({
    "title": "File:",
    "value": uploadedFile.url_private,
    "short": false
  })

  const { ts } = slackRepo.postMessage(message)
  console.log('Message sent: ', ts)
}

run().catch(console.error)
