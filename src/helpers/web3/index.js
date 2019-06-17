// const Logger = require('./helpers/Logger')
// const logger = new Logger('dx-service:web3')
const Web3 = require('web3')
const getWeb3Provider = require('../web3Providers')

let instance, instancePromise

async function _getInstance () {
  const provider = await getWeb3Provider()

  return new Web3(provider)
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
