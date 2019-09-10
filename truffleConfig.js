const assert = require('assert')
const HDWalletProvider = require('./HDWalletProvider')

const DEFAULT_GAS_PRICE_GWEI = 5
const GAS_LIMIT = 5e6
const DEFAULT_MNEMONIC = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'

function truffleConfig ({
  mnemonic,
  privateKey,
  gasPriceGWei = DEFAULT_GAS_PRICE_GWEI,
  gas = GAS_LIMIT,
  aditionalNetwork,
  optimizedEnabled = true,
  urlKovan = 'https://kovan.infura.io/',
  urlRinkeby = 'https://rinkeby.infura.io/', // 'http://node.rinkeby.gnosisdev.com:443',
  urlRopsten = 'https://ropsten.infura.io',
  urlMainnet = 'https://mainnet.infura.io',
  urlDevelopment = 'localhost',
  portDevelopment = 8545,
  solcUseDocker = false,
  solcVersion = '0.5.10',
  // Just a temporal flag to support truffle 4 config
  compatibilityTruffle4 = false,
  debug = () => { }
}) {
  assert(mnemonic || privateKey, 'The mnemonic or privateKey has not been provided')
  debug(`Using gas limit: ${gas / 1000} K`)
  debug(`Using gas price: ${gasPriceGWei} Gwei`)
  debug(`Optimizer enabled: ${optimizedEnabled}`)
  debug('Sign transactions using: %s', mnemonic ? 'Mnemonic' : 'Private Key')

  let _getProvider
  if (privateKey) {
    debug('Using private key')
    _getProvider = url => {
      return () => {
        return new HDWalletProvider({
          privateKeys: [privateKey],
          url
        })
      }
    }
  } else {
    debug(mnemonic === DEFAULT_MNEMONIC ? 'Using default mnemonic' : 'Using custom mnemonic')
    _getProvider = url => {
      return () => {
        return new HDWalletProvider({ mnemonic, url })
      }
    }
  }
  const gasPrice = gasPriceGWei * 1e9

  const networks = {
    development: {
      host: urlDevelopment,
      port: portDevelopment,
      gas,
      gasPrice,
      network_id: '*'
    },
    mainnet: {
      provider: _getProvider(urlMainnet),
      network_id: '1',
      gas,
      gasPrice
    },
    kovan: {
      provider: _getProvider(urlKovan),
      network_id: '42',
      gas,
      gasPrice
    },
    rinkeby: {
      provider: _getProvider(urlRinkeby),
      network_id: '4',
      gas,
      gasPrice
    },
    ropsten: {
      provider: _getProvider(urlRopsten),
      network_id: '3',
      gas,
      gasPrice
    },
    test: {
        host: urlDevelopment,
        port: 8546,
        network_id: 777 // Match any network id
    }
  }

  if (aditionalNetwork) {
    // Add an aditional network
    // Useful, for example to better integration with docker-compose connectivity
    const { name, url, networkId, gas, gasPrice } = aditionalNetwork
    networks[name] = {
      provider: _getProvider(url),
      network_id: networkId,
      gas,
      gasPrice
    }
  }

  const truffleConfig = {
    networks
  }

  if (compatibilityTruffle4) {
    debug('Truffle 4')
    // Truffle 4
    truffleConfig.solc = {
      optimizer: {
        enabled: optimizedEnabled
      }
    }
  } else {
    debug('Truffle 5 - solidity: %s, useDocker: %s', solcVersion, solcUseDocker)
    // Truffle 5
    truffleConfig.compilers = {
      solc: {
        version: solcVersion,
        // docker: solcUseDocker,
        settings: {
          optimizer: {
            enabled: optimizedEnabled, // Default: false
            runs: 200
          }
          // evmVersion: "byzantium"  // Default: "byzantium". Others:  "homestead", ...
        }
      }
    }
  }

  return truffleConfig
}

module.exports = truffleConfig