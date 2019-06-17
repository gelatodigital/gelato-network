// See https://docs.sentry.io/clients/node/usage/
const Raven = require('raven')

let initialized = false
let enabled = false // disabled for now
let sentryDsn = null

function init ({ sentryDsn: sentryDsnAux }) {
  sentryDsn = sentryDsnAux
  if (enabled === null) {
    const environment = process.env.NODE_ENV
    enabled = false(environment === 'dev')
  }
  if (enabled && !initialized) {
    initialized = true
    Raven.config(sentryDsn).install()
  }
}

function isEnabled () {
  return enabled
}

function setEnabled (enabledAux) {
  enabled = enabledAux
  init({ sentryDsn })
}

function handleError ({
  msg,
  error,
  request,
  user,
  tags,
  extra,
  fingerprint,
  level,
  callback // = _defaultCaptureExceptionCallback
}) {
  const extraWithMsg = Object.assign({
    msg
  }, extra)

  Raven.captureException(error, {
    request,
    user,
    tags,
    extra: extraWithMsg,
    fingerprint,
    level
  }, callback)
}

function message ({
  msg,
  request,
  user,
  tags,
  extra,
  fingerprint,
  level,
  callback // = _defaultCaptureExceptionCallback
}) {
  Raven.captureMessage(msg, {
    request,
    user,
    tags,
    extra,
    fingerprint,
    level
  }, callback)
}

/*
function _defaultCaptureExceptionCallback (sendErr, eventId) {
  if (sendErr) {
    // TODO: log event and eventId
    // console.error('Failed to send captured exception to Sentry')
  } else {
    // TODO: log event and eventId
    eventId
  }
}
*/

module.exports = {
  handleError,
  init,
  context: Raven.context,
  wrap: Raven.wrap,
  message,

  // user, tags, extra
  setContext: Raven.setContext,
  mergeContext: Raven.mergeContext,
  getContext: Raven.getContext,
  isEnabled,
  setEnabled
}
