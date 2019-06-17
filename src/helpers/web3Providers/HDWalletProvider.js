const Logger = require('../Logger')
const logger = new Logger('dx-service:web3Providers:hd')
const gracefullShutdown = require('../gracefullShutdown')
const _printProviderError = require('./_printProviderError')

const assert = require('assert')
const Web3 = require('web3')
const TruffleHDWalletProvider = require('truffle-hdwallet-provider')
const sendTxWithUniqueNonce = require('../sendTxWithUniqueNonce')
// const NonceTrackerSubprovider = require('./NonceTrackerSubprovider')

const environment = process.env.NODE_ENV
const isLocal = environment === 'local'

// Disable the nonce lock:
//    - LOCAL: Disabled by default (true)
//    - DEV/PRE/PRO: Enabled by default (false)
//    - Modificable by env var DISABLE_NONCE_LOCK
const NONCE_LOCK_DISABLED = process.env.DISABLE_NONCE_LOCK === 'true' || isLocal

class HDWalletProvider extends TruffleHDWalletProvider {
  constructor ({
    mnemonic,
    privateKeys,
    url,
    addressIndex = 0,
    numAddresses: numAddressesAux = 5,
    shareNonce = true,
    blockForNonceCalculation = 'pending'
  }) {
    logger.info('Create HD wallet provider with url: %s', url)
    const accountCredentials = privateKeys || mnemonic
    let numAddresses = privateKeys ? privateKeys.length : numAddressesAux

    assert(accountCredentials, '"privateKey" or "mnemonic" are mandatory')
    assert(url, '"url" is mandatory')

    super(accountCredentials, url, addressIndex, numAddresses, shareNonce)

    // Notify on provider errors
    this.engine.on('error', _printProviderError)

    // Stop provider on shutdown
    gracefullShutdown.onShutdown(() => this.engine.stop())

    this._web3 = new Web3(this)
    this._blockForNonceCalculation = blockForNonceCalculation
    this._mainAddress = this.addresses[0]
  }

  getNonce (from) {
    return new Promise((resolve, reject) => {
      this._resetNonceCache()
      // console.debug('Get nonce from "%s"', from)
      this._web3.eth.getTransactionCount(from, this._blockForNonceCalculation, (error, nonce) => {
        if (error) {
          // console.error('[HDWalletProvider] Error getting the nonce')
          logger.debug('Error getting the nonce', error)
          reject(error)
        } else {
          // logger.debug('Got nonce %d (%s) for account %s', nonce, nonceHex, from)
          resolve(nonce)
        }
      })
    })
  }

  sendAsync (args) {
    let method = args.method
    if (!method) {
      if (Array.isArray(args) && args.length > 0) {
        method = args[0].method
      } else {
        console.error('Unknown method for: %s', arguments)
      }
    }

    if (method === 'eth_sendTransaction') {
      if (!NONCE_LOCK_DISABLED) {
        this._sendTxWithUniqueNonce(...arguments)
      } else {
        logger.trace('Send transaction: %o', arguments)
        this._resetNonceCache()
        return super.sendAsync(...arguments)
      }
    } else {
      logger.trace('Do async call "%s": %o', method, args)
      return super.sendAsync(...arguments)
    }
  }

  _resetNonceCache () {
    const nonceProvider = this.engine._providers.find(provider => {
      return provider.hasOwnProperty('nonceCache')
    })
    if (nonceProvider === undefined) {
      throw new Error('Unexpected providers setup. Review the HDWalletProvider setup')
    }
    nonceProvider.nonceCache = {}
    // console.log(nonceProvider)
  }

  _sendTxWithUniqueNonce (args) {
    let { params } = args
    const [, callback] = arguments
    let from
    if (Array.isArray(params)) {
      from = params[0].from
    } else {
      from = params.from
    }

    sendTxWithUniqueNonce({
      from: from || this._mainAddress,
      getNonceFn: () => this.getNonce(from),
      sendTransaction: nonce => {
        const nonceHex = '0x' + nonce.toString(16)
        logger.debug('Got nonce %d (%s) for account %s', nonce, nonceHex, from)
        if (Array.isArray(params)) {
          params[0].nonce = nonceHex
        } else {
          params.nonce = nonceHex
        }
        // logger.info('Send transaction with params %O', params)
        // console.log('[HDWalletProvider] Params: %O', params)
        const sendParams = Object.assign({}, args, { params })
        logger.debug('Send transaction with unique nonce: %o', sendParams)

        return new Promise((resolve, reject) => {
          super.sendAsync(sendParams, (error, result) => {
            if (error) {
              reject(error)
              if (callback) {
                callback(error, null)
              }
            }
            resolve(result)
            callback(null, result)
          })
        })
      }
    })
  }

  _sendAsyncWithNonce () {
    return super.sendAsync()
  }

  send () {
    // console.log('[HDWalletProvider] Intercepting send: ', arguments)
    return super.send(...arguments)
  }
}

module.exports = HDWalletProvider
