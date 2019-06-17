const debug = require('debug')('DEBUG-dx-service:tests:helpers:EthereumTestRpcNode')
debug.log = console.debug.bind(console)

var ganache = require('ganache-cli')

class EthereumTestRpcNode {
  // TODO: Research about posibilities with db_path
  constructor ({ web3, mnemonic, port, totalAccounts = 5 }) {
    this._web3 = web3
    this._providerConfig = {
      web3, mnemonic, port, totalAccounts
    }
  }

  start () {
    debug('Start RPC node...')
    const provider = ganache.provider(this._providerConfig)
    this._web3.setProvider(provider)
  }

  stop () {
    debug('Stop RPC node')
  }
}

module.exports = EthereumTestRpcNode
