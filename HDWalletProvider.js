const TruffleHDWalletProvider = require('truffle-hdwallet-provider')
const Web3 = require('web3')

class HDWalletProvider extends TruffleHDWalletProvider {
  constructor ({ mnemonic, privateKeys, url, blockForNonceCalculation = 'pending' }) { // latest
    // console.log('[HDWalletProvider] New provider for: %s', url)
    const accountCredentials = privateKeys || mnemonic
    super(accountCredentials, url)
    this._web3 = new Web3(this)
    this._address = this.addresses[0]
    this._blockForNonceCalculation = blockForNonceCalculation
    // console.log('[HDWalletProvider] Wallet address: ', this._address)
  }

  sendAsync (params) {
    let options
    if (Array.isArray(params)) {
      options = params[0]
    } else {
      options = params
    }
    // console.log('[HDWalletProvider] Intercepting sendAsync: ', arguments)
    const { method } = options
    // console.log('[HDWalletProvider] Intercepting sendAsync - Method: %s', method)
    if (method === 'eth_sendTransaction') {
      const [, callback] = arguments
      // console.log('[HDWalletProvider] Send transaction params: ', options.params)
      this._web3.eth.getTransactionCount(this._address, this._blockForNonceCalculation, (error, nonce) => {
        if (error) {
          console.error('[HDWalletProvider] Error getting the nonce')
          callback(error)
        } else {
          console.log('[HDWalletProvider] Using nonce: ', nonce)
          options.params.nonce = nonce
          // console.log('[HDWalletProvider] Params: ', params)
          return super.sendAsync(options, callback)
        }
      })
    } else {
      return super.sendAsync(...arguments)
    }
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