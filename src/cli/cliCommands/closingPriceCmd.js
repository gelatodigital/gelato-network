const cliUtils = require('../helpers/cliUtils')
const formatUtil = require('../../helpers/formatUtil')

const getDxInfoService = require('../../services/DxInfoService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'closing-price <token-pair> <auctionIndex>',
    'Get the closing price for a given auction',
    yargs => {
      cliUtils.addPositionalByName('token-pair', yargs)
      cliUtils.addPositionalByName('auction-index', yargs)
    }, async function (argv) {
      const { tokenPair, auctionIndex } = argv
      const [ sellToken, buyToken ] = tokenPair.split('-')

      const dxInfoService = await getDxInfoService()

      // Get auction index
      const closingPrice = await dxInfoService.getClosingPrice({
        sellToken, buyToken, auctionIndex
      })

      logger.info('The closing price for auction %d of %s is: %s',
        auctionIndex, tokenPair, formatUtil.formatNumber(closingPrice))
    })
}

module.exports = registerCommand
