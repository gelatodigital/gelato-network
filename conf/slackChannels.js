// Slack: dx-bots (main)
const DX_BOTS_CHANNEL = process.env.SLACK_CHANNEL_DX_BOTS || 'CAEENDQKC'

// Slack: dx-bots-dev (dev channel)
const DX_BOTS_DEV_CHANNEL = process.env.SLACK_CHANNEL_DX_BOTS_DEV || 'GA5J9F13J'

module.exports = {
  DX_BOTS_CHANNEL,
  DX_BOTS_DEV_CHANNEL
}
