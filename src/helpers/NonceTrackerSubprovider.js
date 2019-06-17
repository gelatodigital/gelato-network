const NonceTrackerSubprovider = require('web3-provider-engine/subproviders/nonce-tracker')

class CustomNonceTrackerSubprovider extends NonceTrackerSubprovider {
  handleRequest (payload, next, end) {
    if (payload.method === 'evm_revert') {
      // // Clear cache on a testrpc revert
      // this.nonceCache = {}
      // next()
      return super.handleRequest(payload, next, end)
    } else {
      return super.handleRequest(payload, next, end)
    }
  }

  // handleRequest (payload, next, end) {
  //   next()
  // }
}

module.exports = CustomNonceTrackerSubprovider
