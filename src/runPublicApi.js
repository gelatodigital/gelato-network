const loggerNamespace = 'dx-service:dxPublicApi'
const Logger = require('./helpers/Logger')
const logger = new Logger(loggerNamespace)

// FIXME: Fix event filtering when you don't provide a mnemonic
//  * The event filtering depends on having a mnemonic
//  * The API shouldn't need one, cause it only reads data (no transaction)
//  * We temporarily add an arbitrary mnemonic, just for the API (no funding
//   should ever go to this addresses)
process.env.MNEMONIC = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'
process.env.IS_API = true

// Helpers
const gracefullShutdown = require('./helpers/gracefullShutdown')

const ApiRunner = require('./ApiRunner')

const config = require('../conf/')

function handleError (error) {
  process.exitCode = 1
  logger.error({
    msg: 'Error booting the application: ' + error.toString(),
    error
  })
}

async function start () {
  const { ENVIRONMENT } = config

  const apiRunner = new ApiRunner({
    environment: ENVIRONMENT
  })

  // Let the app stop gracefully
  gracefullShutdown.onShutdown(() => {
    return apiRunner.stop()
  })

  // Start the app
  return apiRunner.start()
}

start().catch(error => {
  // Handle boot errors
  handleError(error)

  // Shutdown app
  return gracefullShutdown.shutDown()
})
