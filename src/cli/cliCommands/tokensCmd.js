const getDxInfoService = require('../../services/DxInfoService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'tokens',
    'Return the list of avaliable token',
    yargs => {
      yargs.option('approved', {
        type: 'boolean',
        default: null,
        describe: 'Return only the approved (true), unaproved(false) or all (default)'
      })
      yargs.option('count', {
        type: 'integer',
        default: 20,
        describe: 'Number of tokens to return'
      })
    }, async function (argv) {
      const { count, approved } = argv

      const dxInfoService = await getDxInfoService()

      // Get auction index
      // TODO: Use pagination, fetch in blocks
      // TODO: Allow to export CSV
      let approvedString
      if (approved === true) {
        approvedString = 'Only approved tokens'
      } else if (approved === false) {
        approvedString = 'Only unapproved tokens'
      } else {
        approvedString = 'Approved or unapproved'
      }
      logger.info('Get the first %d token pairs (%s)', count, approvedString)
      const tokensInfo = await dxInfoService.getTokenList({
        count: count,
        approved
      })
      const tokens = tokensInfo.data
      logger.info('Found %d token pairs\n', tokens.length)
      tokens.forEach((token, number) => {
        printToken(number + 1, token, logger)
      })

      logger.info('')
      logger.info('Are there more token? %s', tokensInfo.startingAfter ? 'Yes' : 'No')
    })
}

function printToken (number, token, logger) {
  logger.info('  - Token %d: %s', number, token.symbol)
  logger.info('    Name: %s', token.name)
  logger.info('    Address: %s', token.address)
  logger.info('    Decimals: %d\n', token.decimals)
}
module.exports = registerCommand
