const cliUtils = require('../helpers/cliUtils')

const getDxInfoService = require('../../services/DxInfoService')

function registerCommand ({ cli, logger }) {
  cli.command(
    'approved <token>',
    'Check if a given token is approved',
    yargs => {
      cliUtils.addPositionalByName('token', yargs)
    }, async function (argv) {
      const { token } = argv
      const dxInfoService = await getDxInfoService()

      // Get auction index
      const approved = await dxInfoService.isApprovedToken({ token })
      logger.info('Is token %s approved? %s', token, approved ? 'Yes' : 'No')
    })
}

module.exports = registerCommand
