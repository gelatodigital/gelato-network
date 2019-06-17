const loggerNamespace = 'dx-service:tasks:generateWeeklyReport'
const Logger = require('../helpers/Logger')
const getVersion = require('../helpers/getVersion')
const logger = new Logger(loggerNamespace)

const got = require('got')

const { BOTS_API_PORT } = require('../../conf/')

// Helpers
const gracefullShutdown = require('../helpers/gracefullShutdown')

// Env
const environment = process.env.NODE_ENV

logger.info('Generate weekly report for %s', environment)

async function generateWeeklyReport () {
  logger.info('Generate weekly report...')
  const version = getVersion()
  const url = `http://localhost:${BOTS_API_PORT}/api/v1/reports/auctions-report/requests`
  logger.info(`GET ${url}`)

  const response = await got(url, {
    json: true,
    retries: 10,
    query: {
      'period': 'last-week',
      'sender-info': 'Scheduled Weekly Report - v' + version
    }
  })
  const { id } = response.body
  logger.info('The report was requested. requestId=%d', id)
}

function handleError (error) {
  process.exitCode = 1
  logger.error({
    msg: 'Error booting the application: ' + error.toString(),
    error
  })
}

// Run app
generateWeeklyReport()
  .then(() => gracefullShutdown.shutDown())
  .catch(error => {
    // Handle boot errors
    handleError(error)

    // Shutdown app
    return gracefullShutdown.shutDown()
  })
