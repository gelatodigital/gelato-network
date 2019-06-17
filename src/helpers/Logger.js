const conf = require('../../conf')
process.env.DEBUG = conf.DEBUG
const Debug = require('debug')

const messageNotifier = require('./messageNotifier')
const version = require('./getVersion')()
// var util = require('util')
// util.format.apply(util, arguments)

class Logger {
  constructor (namespace) {
    this._namespace = namespace

    const [, ...tags] = this._namespace.split(':')
    this._tags = tags
    this.loggers = []
  }

  info (options) {
    this._doLog('INFO', this._getSettings(arguments))
  }

  trace (options) {
    this._doLog('TRACE', this._getSettings(arguments))
  }

  debug (options) {
    this._doLog('DEBUG', this._getSettings(arguments))
  }

  warn (options) {
    this._doLog('WARN', this._getSettings(arguments))
  }

  error (options) {
    this._doLog('ERROR', this._getSettings(arguments))
  }

  _getSettings (args) {
    if (typeof args[0] === 'string') {
      const [msg, ...params] = args
      return { msg, params }
    } else {
      return args[0]
    }
  }

  _doLog (level, {
    msg,
    params = [],
    error,
    notify = false,
    sufix = null,
    contextData = {}
  }) {
    const logger = this._getLogger(level, sufix)
    const isErrorOrWarning = (level === 'WARN' || level === 'ERROR')
    if (isErrorOrWarning || logger.enabled) {
      logger(msg, ...params)
      if (error) {
        console.error(error)
      }

      const doNotify = (
        notify ||
        isErrorOrWarning
      ) && messageNotifier.isEnabled()
      if (doNotify) {
        new Promise((resolve, reject) => {
          const formattedMessage = _sprintf(msg, ...params)
          let tags = this._tags.concat(contextData.tags || [])
          // TODO: Review if we should add version as data? tag?
          tags.push('v' + version)

          const that = this
          const notifierParams = Object.assign(contextData, {
            msg: formattedMessage,
            error,
            tags,
            level: level.toLowerCase(level),
            callback (sendErr, eventId) {
              if (sendErr) {
                // Error sending the message, we just lo
                const errorLogger = (level !== 'ERROR') ? that._getLogger('ERROR', null) : logger
                errorLogger({
                  msg: 'Error notifing message: ' + formattedMessage,
                  notify: false
                })
              }
              /*
              logger(`[${eventId}] ${msg}`, ...params)
              */
            }
          })

          // Notify the message
          if (error) {
            messageNotifier.handleError(notifierParams)
          } else {
            messageNotifier.message(notifierParams)
          }
        }).catch(error => {
          console.error(error)
        })
      }
    }
  }

  _getLogger (prefix, sufix) {
    const loggerName =
      (prefix ? prefix + '-' : '') +
      this._namespace +
      (sufix ? '-' + sufix : '')

    let logger = this.loggers[loggerName]
    if (!logger) {
      logger = Debug(loggerName)

      // Use STDOUT for non error messages
      let consoleFn
      if (prefix === 'DEBUG') {
        consoleFn = 'debug'
      } else if (prefix === 'INFO') {
        consoleFn = 'info'
      } else if (prefix === 'WARN') {
        consoleFn = 'warn'
      }

      if (consoleFn) {
        // Set the console logger function (to use STDOUT)
        // Note that by default is console.error
        logger.log = console[consoleFn].bind(console)
      }

      this.loggers[loggerName] = logger
    }

    return logger
  }
}

function _sprintf () {
  var args = arguments
  var string = args[0]
  var i = 1

  return string.replace(/%((%)|s|d|o|O)/g, function (m) {
    // m is the matched format, e.g. %s, %d
    var val = null
    if (m[2]) {
      val = m[2]
    } else {
      val = args[i]
      // A switch statement so that the formatter can be extended. Default is %s
      switch (m) {
        case '%d':
          val = parseFloat(val)
          if (isNaN(val)) {
            val = 'NaN'
          }
          break
        case '%o':
        case '%O':
          val = JSON.stringify(val)
          break
      }
      i++
    }
    return val
  })
}

module.exports = Logger
