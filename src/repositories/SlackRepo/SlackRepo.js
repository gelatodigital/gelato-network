const assert = require('assert')
const { WebClient } = require('@slack/client')
const environment = process.env.NODE_ENV
const isLocal = environment === 'local'

class SlackRepo {
  constructor () {
    // An access token (from your Slack app or custom integration - xoxp, xoxb, or xoxa)
    const token = process.env.SLACK_TOKEN
    const slackConfig = {}
    if (isLocal) {
      slackConfig.retryConfig = {
        retries: 0
      }
    }
    this._web = token ? new WebClient(token, slackConfig) : undefined
  }

  // This argument can be a channel ID, a DM ID, a MPDM ID, or a group ID
  // const conversationId = 'C1232456'
  postMessage ({ channel, text, attachments, file }) {
    this._assertEnabled()
    this._assertMandatory(['channel'], arguments[0])

    // See: https://api.slack.com/docs/messages/builder
    return this._web.chat
      .postMessage({
        channel,
        text,
        attachments,
        file
      })
  }

  uploadFile ({ fileName, file, channels }) {
    this._assertEnabled()
    this._assertMandatory(['fileName', 'file'], arguments[0])

    return this._web.files.upload({
      filename: fileName,
      file,
      channels
    })
  }

  shareFile ({ fileId }) {
    this._assertEnabled()
    this._assertMandatory(['fileId'], arguments[0])

    return this._web.files.sharedPublicURL({ file: fileId })
  }

  uploadContentFile ({ fileName, content }) {
    this._assertEnabled()
    this._assertMandatory(['fileName', 'content'], arguments[0])

    return this._web.files.upload({
      filename: fileName,
      content
    })
  }

  // See: https://api.slack.com/methods/channels.list
  getChannels ({ excludeArchived = true } = {}) {
    this._assertEnabled()
    return this._web.channels.list({
      exclude_archived: excludeArchived
    })
  }

  getPrivateChannels ({ excludeArchived = true } = {}) {
    this._assertEnabled()
    return this._web.groups.list({
      exclude_archived: excludeArchived
    })
  }

  isEnabled () {
    return this._web !== undefined
  }

  _assertEnabled () {
    assert(this.isEnabled(), 'Slack is disabled. Enable it using SLACK_TOKEN environment var')
  }

  _assertMandatory (paramNames, params) {
    paramNames.forEach(paramName => {
      assert(params[paramName], `'${paramName}' is a required param`)
    })
  }
}

module.exports = SlackRepo
