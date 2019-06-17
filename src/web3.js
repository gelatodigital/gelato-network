const Logger = require('./helpers/Logger')
const logger = new Logger('dx-service:web3')

const assert = require('assert')
const conf = require('../conf')
const Web3 = require('web3')

const gracefullShutdown = require('./helpers/gracefullShutdown')
const HDWalletProvider = require('./helpers/HDWalletProvider')
var NonceTrackerSubprovider = require('web3-provider-engine/subproviders/nonce-tracker')

// We handle this error separatelly, because node throw this error from time to
// time, and it disapears after some seconds
const NODE_ERROR_EMPTY_RESPONSE = 'Error: Invalid JSON RPC response: ""'
const SILENT_TIME_FOR_NODE_ERRORS = 120000 // 120s

let MNEMONIC
const {
  MNEMONIC: CONF_MNEMONIC,
  PK,
  ETHEREUM_RPC_URL
} = conf

// FIXME make API MNEMONIC independent
MNEMONIC = process.env.IS_API ? process.env.MNEMONIC : CONF_MNEMONIC

assert(MNEMONIC || PK, 'The "PK" or MNEMONIC" is mandatory')
assert(ETHEREUM_RPC_URL, 'The "ETHEREUM_RPC_URL" is mandatory')

// Setup provider and Web3
logger.debug('Using %s RPC api to connect to Ethereum', this._url)

let privateKeys, mnemonic
if (PK) {
  privateKeys = [PK]
} else {
  mnemonic = MNEMONIC
}

this._provider = new HDWalletProvider({
  privateKeys,
  mnemonic,
  url: ETHEREUM_RPC_URL,
  addressIndex: 0,
  numAddresses: 5
})

var nonceTracker = new NonceTrackerSubprovider()
this._provider.engine._providers.unshift(nonceTracker)
nonceTracker.setEngine(this._provider.engine)

this._provider.engine.on('error', _printNodeError)
gracefullShutdown.onShutdown(() => this._provider.engine.stop())

let reduceWarnLevelForNodeErrors = false
function _printNodeError (error) {
  const errorMessage = error.message
  let debugLevel
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
    params: [this._url, error.message]
    // error // We hide the stack trace, is not usefull in this case (dispached by web3 internals)
  })
}

module.exports = new Web3(this._provider)
