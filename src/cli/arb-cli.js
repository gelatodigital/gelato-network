#!/usr/bin/env node
require('../../conf')
const loggerNamespace = 'arbitrage-cli'
const Logger = require('../helpers/Logger')
const logger = new Logger(loggerNamespace)
const gracefullShutdown = require('../helpers/gracefullShutdown')

// TODO: If MARKETS is undefined or NULL --> load all
const yargs = require('yargs')

run()
  .then(() => gracefullShutdown.shutDown())
  .catch(error => {
    console.error('Error in CLI', error)
    gracefullShutdown.shutDown()
  })

async function run () {
  const cli = yargs.usage('$0 <cmd> [args]')
  const commandParams = { cli, logger }

  // Arbitrage commands
  require('./arbitrageCommands/arbApproveOwlCmd')(commandParams) // onlyOwner
  require('./arbitrageCommands/arbClaimBuyerFundsCmd')(commandParams) // onlyOwner
  require('./arbitrageCommands/arbDepositEtherCmd')(commandParams)
  require('./arbitrageCommands/arbDepositTokenCmd')(commandParams) // onlyOwner
  require('./arbitrageCommands/arbDutchOpportunityCmd')(commandParams) // onlyOwner
  require('./arbitrageCommands/arbGetBalanceCmd')(commandParams)
  require('./arbitrageCommands/arbGetPriceUniswapCmd')(commandParams)
  require('./arbitrageCommands/arbManualTriggerCmd')(commandParams)
  require('./arbitrageCommands/arbOwner')(commandParams)
  require('./arbitrageCommands/arbTransferEtherCmd')(commandParams) // onlyOwner
  require('./arbitrageCommands/arbTransferOwnership')(commandParams) // onlyOwner
  require('./arbitrageCommands/arbTransferTokenCmd')(commandParams) // onlyOwner
  require('./arbitrageCommands/arbUniswapOpportunityCmd')(commandParams)
  require('./arbitrageCommands/arbWithdrawEtherCmd')(commandParams) // onlyOwner
  require('./arbitrageCommands/arbWithdrawTokenCmd')(commandParams) // onlyOwner
  require('./arbitrageCommands/arbWithdrawTransferEtherCmd')(commandParams) // onlyOwner

  // Setup commands (we might need to move this ones to `setup` cli)
  // add-token-pair, add-funding-for-test-user,...
  const width = Math.min(100, yargs.terminalWidth())
  const argv = cli
    .wrap(width)
    .help('h')
    .strict()
    // .showHelpOnFail(false, 'Specify --help for available options')
    .argv

  if (!argv._[0]) {
    cli.showHelp()
  } else {
    console.log('')
  }
}
