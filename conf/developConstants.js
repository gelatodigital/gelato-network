// TODO remove compatibility code when migration finished
// *** Start unnecesary functions in this file after migrating
const customConfigFile = process.env.CONFIG_FILE
let customConfig = customConfigFile ? require(customConfigFile) : {}

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

const MARKETS =
  customConfig.MARKETS ||
  getEnvMarkets() ||
  [
    { tokenA: 'WETH', tokenB: 'RDN' },
    { tokenA: 'WETH', tokenB: 'OMG' }
  ]

const SPECIAL_TOKENS = ['WETH', 'MGN', 'OWL', 'GNO']
const TOKENS = getConfiguredTokenList(MARKETS)

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
// *** finish unnecesary functions in this file after migrating

module.exports = {
  // Test mnemonic: Good luck trying to take money from this MNEMONIC :)
  MNEMONIC:
    'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat',
  PK: null,
  MARKETS,
  TOKENS,
  ARBITRAGE_CONTRACT_ADDRESS: '0xd54b47f8e6a1b97f3a84f63c867286272b273b7c'
  // TODO use only this default values when migration to latest version finished
  // MARKETS: [
  //   { tokenA: 'WETH', tokenB: 'RDN' },
  //   { tokenA: 'WETH', tokenB: 'OMG' }
  // ],
  // TOKENS: ['RDN', 'OMG', 'WETH']
}
