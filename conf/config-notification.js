// Sentry
const SENTRY_DSN = 'https://471f4b8740094aa0bdd13e08533115b5:67f2a995c8df48bebd64b602a03b722f@sentry.io/302707'
const { DX_BOTS_CHANNEL, DX_BOTS_DEV_CHANNEL } = require('./slackChannels')

module.exports = {
  // Slack: dx-bots (main)
  SLACK_CHANNEL_BOT_FUNDING: null,
  SLACK_CHANNEL_AUCTIONS_REPORT: DX_BOTS_CHANNEL,

  // Slack: dx-bots-dev (dev channel)
  SLACK_CHANNEL_BOT_TRANSACTIONS: null,
  SLACK_CHANNEL_OPERATIONS: DX_BOTS_DEV_CHANNEL,

  // ERROR HANDLING
  SENTRY_DSN
}
