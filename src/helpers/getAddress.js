const getEthereumClient = require('../helpers/ethereumClient')

async function getAddress (accountIndex) {
  const ethereumClient = await getEthereumClient()
  const environment = process.env.NODE_ENV
  return ethereumClient
    .getAccounts()
    .then(accounts => {
      const network = process.env.NETWORK
      const localTesting = (
        !network &&
        environment === 'local'
      )
      if (accountIndex === undefined && localTesting && accounts.length > 1) {
        // In LOCAL, for testing we use:
        //  * the account 0 for the owner
        //  * the account 1 for the bot
        return accounts[1]
      } else if (accountIndex !== undefined && accounts.length > accountIndex) {
        return accounts[accountIndex]
      } else if (accounts.length > 0) {
        // In DEV,PRE and PRO we use the account 0 for the bot
        return accounts[0]
      }
      else {
        return null
        // throw new Error("The ethereumClient doesn't have the bot account configured")
      }
    })
}

module.exports = getAddress
