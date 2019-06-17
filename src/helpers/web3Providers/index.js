const conf = require('../../../conf')
const assert = require('assert')

let instance, instancePromise

function _getInstance () {
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

  let privateKeys, mnemonic
  if (PK) {
    privateKeys = [PK]
  } else {
    mnemonic = MNEMONIC
  }

  // Get factory
  const {
    Factory: Web3Provider,
    factoryConf: web3ProviderConf
  } = conf.getFactory('WEB3_PROVIDER')

  let providerConfig = {
    privateKeys,
    mnemonic,
    url: ETHEREUM_RPC_URL,

    // override config
    ...web3ProviderConf
  }

  // Instanciate the provider
  return new Web3Provider(providerConfig)
}

module.exports = async () => {
  if (!instance) {
    if (!instancePromise) {
      instancePromise = _getInstance()
    }

    instance = await instancePromise
  }

  return instance
}
