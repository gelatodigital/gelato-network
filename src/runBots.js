const loggerNamespace = 'dx-service:runBots'
const Logger = require('./helpers/Logger')
const logger = new Logger(loggerNamespace)

const originalConfig = require('../conf')

// Helpers
const gracefullShutdown = require('./helpers/gracefullShutdown')

const BotRunner = require('./BotRunner')

function handleError (error) {
  process.exitCode = 1
  logger.error({
    msg: 'Error booting the application: ' + error.toString(),
    error
  })
}

async function start ({ config }) {
  const { BOTS, ENVIRONMENT } = config
  const botRunner = new BotRunner({
    bots: BOTS,
    environment: ENVIRONMENT,
    runApiServer: true
  })

  // Let the app stop gracefully
  gracefullShutdown.onShutdown(() => {
    return botRunner.stop()
  })

  // Start the app
  return botRunner.start()
}

start({
  config: originalConfig
}).catch(error => {
  // Handle boot errors
  handleError(error)

  // Shutdown app
  return gracefullShutdown.shutDown()
})
