const SECRET_ENV_VARS = [
  'PK',
  'MNEMONIC'
]
const ENV_PATH = process.env.ENV_PATH

// Load env vars
initEnv()

function initEnv () {
  const { error, parsed } = require('dotenv').config(ENV_PATH && { path: ENV_PATH })

  if (ENV_PATH && error) {
    console.error(`
---------------------- Missing config file ----------------------
  Error configuring ENV vars with file "${ENV_PATH}"

  Make sure you've created the file "${ENV_PATH}"
  
  You can use one of the following as a template:
    - env/mainnet.example
    - env/rinkeby.example
    - env/kovan.example

  i.e) Create a mainnet config by:
        cp env/mainnet.example env/mainnet
        vim env/mainnet
-----------------------------------------------------------------
`)
    throw error
  }

  if (ENV_PATH) {
    console.log(`Overriding defaults with ENV file: ${ENV_PATH}`)
  }

  if (parsed) {
    console.log('Overrided config using ENV vars: ')
    for (let key in parsed) {
      if (SECRET_ENV_VARS.includes(key)) {
        console.log('  %s: %s', key, `<SECRET-${key}>`)
      } else {
        console.log('  %s: %s', key, parsed[key])
      }
    }
  }
}
