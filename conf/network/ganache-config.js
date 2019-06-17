const CONTRACTS_BASE_DIR = 'build/contracts' // 'node_modules/@gnosis.pm/dx-contracts/build/contracts' // 'build/contracts'
const CONTRACTS_ARBITRAGE_DIR = 'build/contracts'

const CONTRACT_DEFINITIONS = {

  ArbitrageContract: CONTRACTS_ARBITRAGE_DIR + '/ArbitrageLocal',
  UniswapFactory: CONTRACTS_ARBITRAGE_DIR + '/IUniswapFactory',
  UniswapExchange: CONTRACTS_ARBITRAGE_DIR + '/IUniswapExchange',
  UniToken: CONTRACTS_BASE_DIR + '/EtherToken',

  GnosisStandardToken: CONTRACTS_BASE_DIR + '/GnosisStandardToken',

  StandardToken: CONTRACTS_BASE_DIR + '/StandardToken',
  DutchExchange: CONTRACTS_BASE_DIR + '/DutchExchange',
  PriceOracleInterface: CONTRACTS_BASE_DIR + '/PriceOracleInterface',
  DutchExchangeProxy: CONTRACTS_BASE_DIR + '/DutchExchangeProxy',
  DutchExchangeHelper: CONTRACTS_BASE_DIR + '/DutchExchangeHelper',
  DutchExchangePriceOracle: CONTRACTS_BASE_DIR + '/DutchXPriceOracle',
  EtherToken: CONTRACTS_BASE_DIR + '/EtherToken',
  TokenFRT: CONTRACTS_BASE_DIR + '/TokenFRT',
  TokenFRTProxy: CONTRACTS_BASE_DIR + '/TokenFRTProxy',
  TokenOWL: CONTRACTS_BASE_DIR + '/TokenOWL',
  TokenOWLProxy: CONTRACTS_BASE_DIR + '/TokenOWLProxy',
  TokenGNO: CONTRACTS_BASE_DIR + '/TokenGNO'
}

module.exports = {
  NETWORK: 'ganache',
  CONTRACTS_BASE_DIR,
  CONTRACTS_ARBITRAGE_DIR,
  CONTRACT_DEFINITIONS,
  UNI_TOKEN_ADDRESS: '0x9f544a3fc3d1045e6ec49d4ecef6dcd700457165',
  SAFE_MODULE_ADDRESSES: null
}
