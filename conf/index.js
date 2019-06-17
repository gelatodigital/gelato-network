require('../src/helpers/loadEnv')

const SPECIAL_TOKENS = ['WETH', 'MGN', 'OWL', 'GNO']
const getTokenOrder = require('../src/helpers/getTokenOrder')

// Get environment: local, dev, pro
let environment = process.env.NODE_ENV ? process.env.NODE_ENV.toLowerCase() : 'local'
process.env.NODE_ENV = environment === 'test' ? 'local' : environment

// Load conf
const defaultConf = {
  ...require('./config-base'),
  ...require('./config-api'),
  ...require('./config-bots'),
  ...require('./config-contracts'),
  ...require('./config-notification'),
  ...require('./config-repos'),
  ...require('./config-web3'),
  ...require('./developConstants')
}

// Load env conf
let envConfFileName
if (environment === 'pre' || environment === 'pro') {
  // PRE and PRO share the same config on purpose (so they are more alike)
  // differences are modeled just as ENV_VARs
  envConfFileName = 'prepro-config'
} else {
  envConfFileName = environment + '-config'
}
const envConf = require('./env/' + envConfFileName)

// Load network conf
const network = process.env.NETWORK
  ? process.env.NETWORK.toLowerCase()
  : 'ganache' // Optional: RINKEBY, KOVAN
const networkConfig = network ? require(`./network/${network}-config`) : {}

// Load custom config file (override default conf)
const customConfigFile = process.env.CONFIG_FILE
let customConfig = customConfigFile ? require(customConfigFile) : {}

// Get markets
const markets =
  customConfig.MARKETS ||
  getEnvMarkets() ||
  envConf.MARKETS ||
  defaultConf.MARKETS

// Get tokens
const tokens = getConfiguredTokenList(markets)
// debug('tokens: %o', tokens)
// debug('envVars: %o', envVars)

// Merge all configs
let config = {
  ...defaultConf,
  ...envConf,
  ...networkConfig,
  ...customConfig,
  ...require('./config-env-vars'),
  MARKETS: markets.map(orderMarketTokens),
  getFactory
}
config.ERC20_TOKEN_ADDRESSES = getTokenAddresses(tokens, config)

// Debug config
process.env.DEBUG = config.DEBUG
const debug = require('debug')('dx-service:conf')
debug.log = console.debug.bind(console)

// debug('markets: %o', markets)
debug('tokens', tokens)
debug('config.ERC20_TOKEN_ADDRESSES', config.ERC20_TOKEN_ADDRESSES)
// debug('config.ERC20_TOKEN_ADDRESSES: \n%O', config.ERC20_TOKEN_ADDRESSES)

// Normalize token order for markets (alphabet order)
function orderMarketTokens ({ tokenA, tokenB }) {
  const [sortedTokenA, sortedTokenB] = getTokenOrder(tokenA, tokenB)
  return { tokenA: sortedTokenA, tokenB: sortedTokenB }
}

function getEnvMarkets () {
  const envMarkets = process.env.MARKETS
  if (envMarkets) {
    const marketsArray = envMarkets.split(',')
    return marketsArray.map(marketString => {
      const market = marketString.split('-')
      return {
        tokenA: market[0],
        tokenB: market[1]
      }
    })
  } else {
    return null
  }
}

function getConfiguredTokenList (markets) {
  const result = []

  function isSpecialToken (token) {
    return SPECIAL_TOKENS.indexOf(token) !== -1
  }

  function addToken (token) {
    if (!result.includes(token) && !isSpecialToken(token)) {
      result.push(token)
    }
  }

  markets.forEach(({ tokenA, tokenB }) => {
    addToken(tokenA)
    addToken(tokenB)
  })

  return result
}

function getTokenAddresParamName (token) {
  return `${token}_TOKEN_ADDRESS`
}

function getTokenAddresses (tokens, config) {
  return tokens.reduce((tokenAddresses, token) => {
    const paramName = getTokenAddresParamName(token)
    const address = process.env[paramName] || config[paramName]
    if (address) {
      // FIXME token addresses to lowercase to avoid issues when checking from addresses
      // from the DutchX contract. We should use toChecksum in web3js 1.0
      tokenAddresses[token] = address.toLowerCase()
    } else if (config.ENVIRONMENT === 'local') {
      tokenAddresses[token] = null
    } else {
      throw new Error(`The token ${token} is declared in the market, but no \
param ${paramName} was specified. Environemnt: ${config.ENVIRONMENT}`)
    }
    return tokenAddresses
  }, {})
}

/**
* @param {string} factoryPropName. Name of the property to look for in the configuration object
* @return {Object} Dictionary object containing reference to the looked up object and its eventual configuration
*/
function getFactory (factoryPropName) {
  const assert = require('assert')
  const path = require('path')

  const factoryConfAux = config[factoryPropName]
  assert(factoryConfAux, `"${factoryPropName}" was not defined in the conf`)

  const { factory, ...factoryConf } = factoryConfAux
  assert(factory, `"factory" is required in ${factoryPropName} config`)

  const factoryPath = path.join('../', factory)
  // console.log('factoryPath: ', factoryPath)
  const Factory = require(factoryPath)

  return {
    Factory,
    factoryConf
  }
}

module.exports = config
