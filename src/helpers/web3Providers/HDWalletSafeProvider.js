const assert = require('assert')
const truffleContract = require('truffle-contract')
const TruffleHDWalletProvider = require('truffle-hdwallet-provider')
const Web3 = require('web3')
const gracefullShutdown = require('../gracefullShutdown')
const _printProviderError = require('./_printProviderError')

const Logger = require('../Logger')
const sendTxWithUniqueNonce = require('../sendTxWithUniqueNonce')

const environment = process.env.NODE_ENV
const isLocal = environment === 'local'
const DEFAULT_GAS_TX = 30000
const DEFAULT_EXTRA_GAS_SAFE_TX = 50000

const logger = new Logger('dx-service:web3Providers:safe')

// TODO
// Figure out if we can create a base HDWalletProvider class with common methods for all providers
// like getNonce

// Disable the nonce lock:
//    - LOCAL: Disabled by default (true)
//    - DEV/PRE/PRO: Enabled by default (false)
//    - Modificable by env var DISABLE_NONCE_LOCK
const NONCE_LOCK_DISABLED = process.env.DISABLE_NONCE_LOCK === 'true' || isLocal

// Caches the truffle contracts for the Safe
const SAFE_CONTRACT_CACHE = {}

class HDWalletSafeProvider extends TruffleHDWalletProvider {
  constructor ({
    mnemonic,
    privateKeys,
    url,
    addressIndex = 0,
    numAddresses: numAddressesAux = 5,
    shareNonce = true,
    blockForNonceCalculation = 'pending',
    safes = [],
    defaultGas = DEFAULT_GAS_TX,
    defaultExtraGasSafeTx = DEFAULT_EXTRA_GAS_SAFE_TX
  }) {
    const accountCredentials = privateKeys || mnemonic
    let numAddresses = privateKeys ? privateKeys.length : numAddressesAux

    assert(accountCredentials, '"privateKey" or "mnemonic" are mandatory')
    assert(url, '"url" is mandatory')
    logger.info('Create Safe wallet provider with url "%s" and %d safes', url, safes.length)
    super(accountCredentials, url, addressIndex, numAddresses, shareNonce)

    // Notify on provider errors
    this.engine.on('error', _printProviderError)

    // Stop provider on shutdown
    gracefullShutdown.onShutdown(() => this.engine.stop())

    // Configure all the safes, and construct some handy maps
    this._safesByOperator = this._loadSafesByOperator(safes)

    this._safesByAddress = Object.values(this._safesByOperator).reduce((acc, safes) => {
      safes.forEach(safe => {
        acc[safe.safeAddress] = safe
      })
      return acc
    }, {})
    this._safeAddresses = Object.keys(this._safesByAddress)

    this._blockForNonceCalculation = blockForNonceCalculation
    this._defaultGas = defaultGas
    this._defaultExtraGasSafeTx = defaultExtraGasSafeTx
    this._defaultFrom = this.getAccounts()[0]
    this._web3 = new Web3(this)
  }

  _loadSafesByOperator (safes) {
    const that = this
    return safes.reduce((acc, safe, index) => {
      const {
        operatorAddressIndex,
        safeAddress,
        safeModuleType = 'complete',
        safeModuleAddress
      } = safe
      assert(operatorAddressIndex >= 0, `"operatorAddressIndex" is mandatory for running in Safe mode. Offending safe: ${index}`)
      assert(that.addresses.length > operatorAddressIndex, `"operatorAddressIndex" cannot be ${operatorAddressIndex}, there's only ${that.addresses.length} addresses in the waller. Offending safe: ${index}`)

      const operatorAddress = that.addresses[operatorAddressIndex]
      assert(operatorAddress, `"operatorAddress" cannot get the address number ${operatorAddressIndex}. Offending safe: ${index}`)

      if (safeAddress) {
        assert(safeModuleType, `"moduleType" is mandatory for running in Safe mode. Offending safe: ${index}`)
        assert(safeModuleAddress, `"safeModuleAddress" is mandatory for running in Safe mode. Offending safe: ${index}`)

        logger.debug(`Configuring Safe account: ${index + 1} of ${safes.length}:
          safeAddress: ${safeAddress}
          operatorAddress: ${operatorAddress}
          safeModuleAddress: ${safeModuleAddress}
          moduleType: ${safeModuleType}`)

        const moduleContract = that._loadSafeModuleContract({
          moduleType: safeModuleType,
          safeModuleAddress
        })

        const safeDetails = {
          id: index,
          operatorAddress,
          safeAddress,
          moduleType: safeModuleType,
          safeModuleAddress,
          moduleContract
        }

        if (acc[operatorAddress]) {
          acc[operatorAddress].push(safeDetails)
        } else {
          acc[operatorAddress] = [safeDetails]
        }
      } else {
        logger.debug(`Configuring a NON Safe account: ${index + 1} of ${safes.length}
          operatorAddress: ${operatorAddress}`)

        if (!acc[operatorAddress]) {
          // Add operator, but without safe
          acc[operatorAddress] = []
        }
      }

      return acc
    }, {})
  }

  _loadSafeModuleContract ({
    moduleType,
    safeModuleAddress
  }) {
    let SafeModuleContract = SAFE_CONTRACT_CACHE[moduleType]
    if (!SafeModuleContract) {
      let contractName
      switch (moduleType) {
        case 'complete':
          contractName = 'DutchXCompleteModule.json'
          break
        case 'seller':
          contractName = 'DutchXSellerModule.json'
          break
        default:
          throw new Error('Unknown safe module type: ' + moduleType)
      }
      const moduleABI = require('@gnosis.pm/safe-modules/build/contracts/' + contractName)
      SafeModuleContract = truffleContract(moduleABI)
      // SafeModuleContract.setProvider(this)

      SAFE_CONTRACT_CACHE[moduleType] = SafeModuleContract
    }

    return SafeModuleContract.at(safeModuleAddress)
  }

  // Force return the Safe address
  getAccounts () {
    return this._safeAddresses
  }

  // Force return the Safe address
  getAddress (idx) {
    return this._safeAddresses[idx]
  }

  // Force return the Safe address
  getAddresses () {
    return this._safeAddresses
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
    /*
    { jsonrpc: '2.0',
      id: 23,
      method: 'eth_sendTransaction',
      params:
       [ { from: '0x2c01003f521698f7625082077d2095a67e3c6723',
           value: '0x38d7ea4c68000',
           to: '0xf25186b5081ff5ce73482ad761db0eb0d25abfbf',
           data: '0xd0e30db0' } ] }

     { '0':
        { jsonrpc: '2.0',
          id: 1,
          method: 'web3_clientVersion',
          params: [] },
       '1': [Function] }
    */

    let method = args.method
    let params = args.params

    if (!method) {
      if (Array.isArray(args) && args.length > 0) {
        method = args[0].method
      } else {
        console.error('Unknown method for: %s', arguments)
      }
    }

    if (!params) {
      if (Array.isArray(args) && args.length > 0) {
        params = args[0].params
      } else {
        console.error('Unknown method for: %s', arguments)
      }
    }

    // if (method === 'eth_estimateGas') {
    //   logger.debug('Estimate gas: %O', params)
    // }
    // logger.info(method, arguments)

    if (method === 'eth_sendTransaction') {
      // Get Safe Module contract data
      const [txObject, ...extraArguments] = arguments
      const [txDetails, ...extraParams] = txObject.params

      const {
        from
      } = txDetails

      const safe = this._safesByAddress[from]
      const operator = this._safesByOperator[from]

      // TODO: Allow to send transaction directly with the operator
      //  - Normally transactions with the mulstisig as the "from" address
      //  - It might be an interesting adition to allow to provide the operator
      //    as the "from". In this case, the tx is sent without the module

      if (safe) {
        return this._rewriteSendTransactionForSafe({ safe, txArguments: arguments })
      } else if (operator) {
        // It's a known operator trying to perform a transaction
        return super.sendAsync(...arguments)
      } else {
        throw new Error(`Unknown safe/operator with address ${from}. Known safes are: ${this._safeAddresses.join(', ')}`)
      }
    } else if (method === 'eth_accounts') {
      logger.trace('Get accounts')
      const [params, callback] = arguments
      const {
        id,
        jsonrpc
      } = params

      // return safe addresses
      return callback(null, {
        id,
        jsonrpc,
        result: this.getAccounts()
      })
    } else {
      logger.trace('Do async call "%s": %o', method, args)
      return super.sendAsync(...arguments)
    }
  }

  _rewriteSendTransactionForSafe ({ safe, txArguments }) {
    // Get Safe Module contract data
    const [txObject, ...extraArguments] = txArguments
    const [txDetails, ...extraParams] = txObject.params

    const {
      moduleContract,
      safeModuleAddress,
      operatorAddress
    } = safe

    const {
      to,
      gas: originalGas = this._defaultGas,
      value = 0,
      data
    } = txDetails

    let gas = (typeof originalGas === 'string') ? parseInt(originalGas) : originalGas
    gas += this._defaultExtraGasSafeTx

    const executeWhitelistedCallData = moduleContract.executeWhitelisted.request(to, value, data)

    const moduleData = executeWhitelistedCallData.params[0].data
    logger.debug(`Send transaction using the safe module:
      Original tx:
        To: ${to}
        Value: ${value}
        Original Data: ${data}
      Safe Module: ${safeModuleAddress}
        Operator: ${operatorAddress}
        Data: ${moduleData}`)

    // Rewrite the transaction so it's sent to the safe instead
    const safeTxArguments = [{
      ...txObject,

      // Override params
      params: [{
        'from': operatorAddress,
        'to': safeModuleAddress,
        'value': 0,
        'data': moduleData,
        'gas': gas
      }, ...extraParams]
    }, ...extraArguments]

    // TODO: Remove
    logger.debug('Send transaction: %O', safeTxArguments)
    logger.debug('Transaction - params: ', safeTxArguments[0].params)

    if (!NONCE_LOCK_DISABLED) {
      return this._sendTxWithUniqueNonce(...safeTxArguments)
    } else {
      logger.trace('Send transaction: %o', safeTxArguments)
      this._resetNonceCache()
      return super.sendAsync(...safeTxArguments)
    }
  }

  // _getOperatorFromSafe(from) {
  //   const safe = this._safesByAddress[from]
  //   if (!safe) {
  //     const errorMsg = `The "from" address must be a known Safe contract. From: ${from}. Safe Addresses: ${this._safeAddresses.join(', ')}`
  //     console.error(errorMsg)
  //     assert(false, errorMsg)
  //   }

  //   return safe.operatorAddress
  // }

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
      from: from || this._defaultFrom,
      getNonceFn: () => this.getNonce(from),
      sendTransaction: nonce => {
        const nonceHex = '0x' + nonce.toString(16)
        logger.debug('Got nonce %d (%s) for account %s', nonce, nonceHex, from)
        if (Array.isArray(params)) {
          params[0].nonce = nonceHex
        } else {
          params.nonce = nonceHex
        }

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

  _resetNonceCache () {
    const nonceProvider = this.engine._providers.find(provider => {
      return provider.hasOwnProperty('nonceCache')
    })
    if (nonceProvider === undefined) {
      throw new Error('Unexpected providers setup. Review the HDWalletProvider setup')
    }
    nonceProvider.nonceCache = {}
  }
}

module.exports = HDWalletSafeProvider
