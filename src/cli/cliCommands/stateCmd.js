const cliUtils = require('../helpers/cliUtils')
const printState = require('../helpers/printState')

const getDxInfoService = require('../../services/DxInfoService')
const getEthereumClient = require('../../helpers/ethereumClient')

function registerCommand ({ cli, logger }) {
  cli.command('state <token-pair>', 'Get the state for a given pair (i.e. WETH-RDN)', yargs => {
    cliUtils.addPositionalByName('token-pair', yargs)
  }, async function (argv) {
    const { tokenPair: tokenPairString } = argv
    const [sellToken, buyToken] = tokenPairString.split('-')
    const [
      ethereumClient, // TODO: use services instead
      dxInfoService
    ] = await Promise.all([
      getEthereumClient(),
      getDxInfoService()
    ])

    // Get data
    const tokenPair = { sellToken, buyToken }
    const now = await ethereumClient.geLastBlockTime()
    const marketDetails = await dxInfoService.getMarketDetails(tokenPair)

    // Print state
    const message = `State of ${sellToken}-${buyToken}`
    printState({ logger, message, tokenPair, now, marketDetails })
  })
}

module.exports = registerCommand
