const loggerNamespace = 'dx-service:api:error'
const Logger = require('../../helpers/Logger')
const logger = new Logger(loggerNamespace)

function requestErrorHandler (err, req, res) {
  // set locals, only providing error in development
  // const isDev = req.app.get('env') === 'development'
  // res.locals.message = err.message
  // res.locals.error = isDev ? err : {}
  const status = err.status || 500
  const error = {
    status,
    type: err.type || 'INTERNAL_ERROR',
    data: err.data,
    message: err.message
  }

  // We add the stack trace for all errors but 4XX
  if (error.status < 400 || error.status >= 500) {
    error.stackTrace = err.stack
    logger.error({
      msg: `Error ${error.status}: ${error.message}`,
      error: err
    })
  }

  const response = res.status(error.status)
  response.send(error)

  // TODO: Add template engine and uncomment
  // const contentType = req.headers['content-type']
  // if (contentType && contentType.indexOf('application/json') !== -1) {
  //   response.send(toErrorDto(isDev, err))
  // } else {
  //   response.render('error')
  // }
}

module.exports = {
  requestErrorHandler
}
