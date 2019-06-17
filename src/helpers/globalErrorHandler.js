const loggerNamespace = 'dx-service:error'
const Logger = require('../helpers/Logger')
const logger = new Logger(loggerNamespace)

process.on('unhandledRejection', error => {
  logger.error({
    msg: 'Uncought promise rejection: ' + error.toString(),
    error
  })
})
