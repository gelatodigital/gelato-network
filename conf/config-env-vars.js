// List of environment variables that can be defined when launching application
const ENV_VAR_LIST = [
  // Logging
  'DEBUG',

  // API
  'PUBLIC_API_PORT',
  'PUBLIC_API_HOST',
  'BOTS_API_PORT',
  'BOTS_API_HOST',

  // BASE
  'ENVIRONMENT',
  'DEFAULT_GAS',
  'ETHEREUM_RPC_URL',
  'MNEMONIC',
  'PK',

  // CONTRACTS
  'DX_CONTRACT_ADDRESS',
  'UNISWAP_FACTORY_ADDRESS',
  'ARBITRAGE_CONTRACT_ADDRESS',
  'GNO_TOKEN_ADDRESS',

  // REPOS
  'DEFAULT_GAS_PRICE_USED',
  'TRANSACTION_RETRY_TIME',
  'GAS_RETRY_INCREMENT',
  'OVER_FAST_PRICE_FACTOR',
  'GAS_ESTIMATION_CORRECTION_FACTOR'
]

function returnEnvVars (envVarList) {
  return envVarList.reduce((envVars, envVar) => {
    const value = process.env[envVar]
    // console.log('Load envVar: ', envVar, value, typeof value)
    if (value !== undefined) {
      envVars[envVar] = value
    }

    return envVars
  }, {})
}

module.exports = returnEnvVars(ENV_VAR_LIST)
