module.exports = {
  ENVIRONMENT: 'local',
  DEBUG: process.env.DEBUG || 'ERROR-*,WARN-*,INFO-*',
  MARKETS: [],

  // Gas
  DEFAULT_GAS: 6700000,

  // Ethereum config
  ETHEREUM_RPC_URL: process.env.ETHEREUM_RPC_URL || 'http://127.0.0.1:8545',
  MNEMONIC: process.env.DEBUG || null,
  PK: process.env.PK || null,

  // Cache
  CACHE: _getCacheConf()
}

function _getCacheConf () {
  const CACHE_ENABLED = process.env.CACHE_ENABLED
  const cacheEnabled = CACHE_ENABLED === 'true' || CACHE_ENABLED === undefined
  let CACHE
  if (cacheEnabled) {
    CACHE = {
      short: process.env.CACHE_TIMEOUT_SHORT || 1,
      average: process.env.CACHE_TIMEOUT_AVERAGE || 15,
      long: process.env.CACHE_TIMEOUT_LONG || 120
    }
  }

  return CACHE
}
