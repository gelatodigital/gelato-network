#!/usr/bin/env node
require('../../conf')
const loggerNamespace = 'cli'
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

  // Info commands
  require('./cliCommands/balancesCmd')(commandParams)
  require('./cliCommands/marketsCmd')(commandParams)
  require('./cliCommands/tokensCmd')(commandParams)
  require('./cliCommands/stateCmd')(commandParams)
  require('./cliCommands/priceCmd')(commandParams)
  require('./cliCommands/usdPriceComand')(commandParams)
  require('./cliCommands/marketPriceCmd')(commandParams)
  require('./cliCommands/closingPricesCmd')(commandParams)
  require('./cliCommands/getSellerBalanceCmd')(commandParams)
  require('./cliCommands/auctionBalancesTokensCmd')(commandParams)
  require('./cliCommands/indexCmd')(commandParams)
  require('./cliCommands/approvedCmd')(commandParams)
  require('./cliCommands/closingPriceCmd')(commandParams)
  require('./cliCommands/closingPriceOfficialCmd')(commandParams)
  require('./cliCommands/liquidityContributionCmd')(commandParams)
  require('./cliCommands/claimingsCmd')(commandParams)

  // Trade commands
  require('./cliCommands/sendCmd')(commandParams)
  require('./cliCommands/getAllowance')(commandParams)
  require('./cliCommands/setAllowance')(commandParams)
  require('./cliCommands/depositCmd')(commandParams)
  require('./cliCommands/withdrawCmd')(commandParams)
  require('./cliCommands/buyCmd')(commandParams)
  require('./cliCommands/sellCmd')(commandParams)
  require('./cliCommands/tradesCmd')(commandParams)
  require('./cliCommands/auctionsCmd')(commandParams)
  require('./cliCommands/unwrapEtherCmd')(commandParams)
  require('./cliCommands/claimableTokensCmd')(commandParams)
  require('./cliCommands/claimTokensCmd')(commandParams)
  require('./cliCommands/claimSellerFundsCmd')(commandParams)
  require('./cliCommands/claimBuyerFundsCmd')(commandParams)

  // Liquidity commands
  require('./cliCommands/sellLiquidityCmd')(commandParams)
  require('./cliCommands/buyLiquidityCmd')(commandParams)

  // Dx Management commands
  require('./cliCommands/addTokenPairCmd')(commandParams)

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
