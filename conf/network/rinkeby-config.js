// const NETWORKS = require('../../node_modules/@gnosis.pm/dx-contracts/networks.json')
const NETWORKS_DEV = require('../../node_modules/@gnosis.pm/dx-contracts/networks-dev.json')
const GNO_NETWORKS = require('../../node_modules/@gnosis.pm/gno-token/networks.json')
// const ARBITRAGE_NETWORKS = require('../../node_modules/@gnosis.pm/dx-uniswap-arbitrage/networks.json')

const env = process.env.NODE_ENV
let DX_CONTRACT_ADDRESS, DX_HELPER_ADDRESS, RDN_TOKEN_ADDRESS, OMG_TOKEN_ADDRESS, GNO_TOKEN_ADDRESS, UNISWAP_FACTORY_ADDRESS, ARBITRAGE_CONTRACT_ADDRESS
let DAI_TOKEN_ADDRESS, GEN_TOKEN_ADDRESS, MKR_TOKEN_ADDRESS

// In Rinkeby we use different instances of the contract for dev and staging
if (env === 'pre' || env === 'pro') {
  // Rinkeby: staging
  //  We use set all addresses to null, because they should be provided
  //  The DX contract address is loaded from the NPM package
  DX_CONTRACT_ADDRESS = null
  DX_HELPER_ADDRESS = null
  RDN_TOKEN_ADDRESS = null
  OMG_TOKEN_ADDRESS = null

  UNISWAP_FACTORY_ADDRESS = '0xf5D915570BC477f9B8D6C0E980aA81757A3AaC36'
} else if (env === 'dev') {
  // Rinkeby: dev
  //  We use a different DX contract than the one defined in the NPM package
  DX_CONTRACT_ADDRESS = NETWORKS_DEV['DutchExchangeProxy']['4'].address
  DX_HELPER_ADDRESS = NETWORKS_DEV['DutchExchangeHelper']['4'].address
  RDN_TOKEN_ADDRESS = '0x3615757011112560521536258c1e7325ae3b48ae'
  OMG_TOKEN_ADDRESS = '0x00df91984582e6e96288307e9c2f20b38c8fece9'
  GNO_TOKEN_ADDRESS = GNO_NETWORKS['TokenGNO']['4'].address

  UNISWAP_FACTORY_ADDRESS = '0xf5D915570BC477f9B8D6C0E980aA81757A3AaC36'

  // Old ones
  // RDN_TOKEN_ADDRESS = '0x7e2331beaec0ded82866f4a1388628322c8d5af0'
  // OMG_TOKEN_ADDRESS = '0xc57b5b272ccfd0f9e4aa8c321ec22180cbb56054'
} else {
  // Rinkeby: local
  DX_CONTRACT_ADDRESS = null
  DX_HELPER_ADDRESS = null
  UNISWAP_FACTORY_ADDRESS = '0xf5D915570BC477f9B8D6C0E980aA81757A3AaC36'
  RDN_TOKEN_ADDRESS = '0x3615757011112560521536258c1e7325ae3b48ae'
  OMG_TOKEN_ADDRESS = '0x00df91984582e6e96288307e9c2f20b38c8fece9'

  DAI_TOKEN_ADDRESS = '0x1638578de407719a486db086b36b53750db0199e'
  GEN_TOKEN_ADDRESS = '0xa1f34744c80e7a9019a5cd2bf697f13df00f9773'
  MKR_TOKEN_ADDRESS = '0xe315cb6fa401092a7ecc92f05c62d05a974012f4'

  // Old ones
  // RDN_TOKEN_ADDRESS = '0x7e2331beaec0ded82866f4a1388628322c8d5af0'
  // OMG_TOKEN_ADDRESS = '0xc57b5b272ccfd0f9e4aa8c321ec22180cbb56054'
}

const URL_GAS_PRICE_FEED_GAS_STATION = null
const URL_GAS_PRICE_FEED_SAFE = 'https://safe-relay.staging.gnosisdev.com/api/v1/gas-station' // rinkeby

module.exports = {
  NETWORK: 'rinkeby', // 4

  // ETHEREUM_RPC_URL: 'https://rinkeby.infura.io/v3/9408f47dedf04716a03ef994182cf150',
  ETHEREUM_RPC_URL: 'https://node.rinkeby.gnosisdev.com',

  // Gas price feed
  URL_GAS_PRICE_FEED_GAS_STATION,
  URL_GAS_PRICE_FEED_SAFE,

  // Tokens
  DX_CONTRACT_ADDRESS,
  DX_HELPER_ADDRESS,
  UNISWAP_FACTORY_ADDRESS,
  ARBITRAGE_CONTRACT_ADDRESS,
  GNO_TOKEN_ADDRESS,
  RDN_TOKEN_ADDRESS,
  OMG_TOKEN_ADDRESS,
  DAI_TOKEN_ADDRESS,
  GEN_TOKEN_ADDRESS,
  MKR_TOKEN_ADDRESS
}
