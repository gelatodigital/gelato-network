const Logger = require('./helpers/Logger')
const logger = new Logger('dx-service:web3')

const assert = require('assert')
const Web3 = require('web3')

const gracefullShutdown = require('./helpers/gracefullShutdown')
const HDWalletProvider = require('./helpers/HDWalletProvider')
const HDWalletSafeProvider = require('./helpers/HDWalletSafeProvider')
var NonceTrackerSubprovider = require('web3-provider-engine/subproviders/nonce-tracker')

// We handle this error separatelly, because node throw this error from time to
// time, and it disapears after some seconds
const NODE_ERROR_EMPTY_RESPONSE = 'Error: Invalid JSON RPC response: ""'
const SILENT_TIME_FOR_NODE_ERRORS = 120000 // 120s

/**
 * Executes Web3 setup
 * @return {Object} instance of Web3
 */
function _getWeb3 ({ conf }) {
  const {
    MNEMONIC,
    ETHEREUM_RPC_URL
  } = conf

  assert(MNEMONIC, 'The "MNEMONIC" is mandatory')
  assert(ETHEREUM_RPC_URL, 'The "ETHEREUM_RPC_URL" is mandatory')

  // Setup provider and Web3
  logger.debug('Using %s RPC api to connect to Ethereum', this._url)
  // Get configuration mode
  let configMode = conf.getDXMode()
  logger.debug(`Use DX ${configMode} configuration mode`)

  if (configMode === 'safe') {
    const { SAFE_MODULE_ADDRESSES } = conf
    // Determine which safe-module to use (complete or seller)
    let safeModuleMode = 'complete' // complete by default
    let safeModuleAddress = SAFE_MODULE_ADDRESSES.SAFE_COMPLETE_MODULE_CONTRACT_ADDRESS

    if (SAFE_MODULE_ADDRESSES.SAFE_SELLER_MODULE_CONTRACT_ADDRESS) {
      safeModuleMode = 'seller'
      safeModuleAddress = SAFE_MODULE_ADDRESSES.SAFE_SELLER_MODULE_CONTRACT_ADDRESS
    }

    logger.debug(`Use Safe-Module ${safeModuleMode} mode`)

    this._provider = new HDWalletSafeProvider({
      mnemonic: MNEMONIC,
      url: ETHEREUM_RPC_URL,
      addressIndex: 0,
      numAddresses: 5,
      safeAddress: SAFE_MODULE_ADDRESSES.SAFE_ADDRESS,
      safeModuleAddress,
      safeModuleMode
    })
    this._provider.loadSafeModule()
  } else {
    this._provider = new HDWalletProvider({
      mnemonic: MNEMONIC,
      url: ETHEREUM_RPC_URL,
      addressIndex: 0,
      numAddresses: 5
    })
    console.log('nonce tracker getWeb3.js')
    var nonceTracker = new NonceTrackerSubprovider()
    this._provider.engine._providers.unshift(nonceTracker)
    nonceTracker.setEngine(this._provider.engine)
  }

  this._provider.engine.on('error', _printNodeError)
  gracefullShutdown.onShutdown(() => this._provider.engine.stop())
  return new Web3(this._provider)
}

/**
 * Handles NodeJS errors
 * @param {Object} error
 */
function _printNodeError (error) {
  const errorMessage = error.message
  let debugLevel; let reduceWarnLevelForNodeErrors = false
  if (errorMessage === NODE_ERROR_EMPTY_RESPONSE) {
    if (reduceWarnLevelForNodeErrors) {
      debugLevel = 'warn'
    } else {
      debugLevel = 'error'
      reduceWarnLevelForNodeErrors = true
      setTimeout(() => {
        reduceWarnLevelForNodeErrors = false
      }, SILENT_TIME_FOR_NODE_ERRORS)
    }
  } else {
    debugLevel = 'error'
  }
  logger[debugLevel]({
    msg: 'Error in Ethereum node %s: %s',
    params: [ this._url, error.message ]
    // error // We hide the stack trace, is not usefull in this case (dispached by web3 internals)
  })
}

module.exports = _getWeb3
