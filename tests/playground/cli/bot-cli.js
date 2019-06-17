#!/usr/bin/env node
const debug = require('debug')('DEBUG-dx-service:tests:helpers:testSetup')
debug.log = console.debug.bind(console)

const commander = require('commander')

const getVersion = require('../../../src/helpers/getVersion')
const gracefullShutdown = require('../../../src/helpers/gracefullShutdown')
const testSetup = require('../../helpers/testSetup')
// const BigNumber = require('bignumber.js')
const BOT_CLI_SCRIPT = 'npm run cli --'

console.log('%%% I am in ./tests/playground/cli/bot-cli.js%%%')


// const environment = process.env.NODE_ENV
// const isLocal = environment === 'local'

const setupInstance = testSetup()
setupInstance
  .then(run)
  .then(() => gracefullShutdown.shutDown())
  .catch(error => {
    console.error(error)
    gracefullShutdown.shutDown()
  })

function list (val) {
  return val.split(',')
}

async function run ({
  dxTradeService,
  // TODO: Repos and ethereumClient should disapear (we should move logic to serviceCli)
  auctionRepo,
  ethereumClient,

  botAccount,
  owner,
  user1,

  // The utils should be imported from the helper functions
  printProps,
  fractionFormatter,
  printTime,
  printState,
  printAddresses,
  setAuctionRunningAndFundUser,
  fundUser1,
  addTokens,
  buySell,
  deposit,
  delay
  /*
  dx,
  dxMaster,
  web3,
  */
}) {
  commander
    .version(getVersion(), '-v, --version')
    .option('-n, --now', 'Show current time')
    .option('-a, --addresses', 'Addresses for main contracts and tokens')
    .option('-I, --setup', 'Basic setup for testing porpouses. Set the auction to RUNNING and ensures the user has funding')
    .option('-$, --setup-funding', 'Ensures the test user has funding')
    .option('-M, --send <token>,<amount>[,<to-account>[,<from-account>]]', 'Send a token to an arbitrary account (i.e. --send WETH,0.1,0xf17f52151ebef6c7334fad080c5704d77216b732) ', list)
    .option('-F, --fund <token>,<amount>[,<account-index>]', 'Fund a user account (i.e. --fund WETH,0.1) ', list)
    .option('-A, --approve-token <token>', 'Approve token', list)
    .option('-x --state "<sell-token>,<buy-token>"', 'Show current state', list)
    .option('-D, --deposit "<token>,<amount>"', 'Deposit tokens (i.e. --deposit WETH,0.1)', list)
    .option('-z --add-tokens', 'Ads RDN-WETH') //  OMG-WETH and RDN-OMG
    .option('-k --closing-price "<sell-token>,<buy-token>,<auction-index>"', 'Show closing price', list)
    .option('-p --price "<sell-token>,<buy-token>,<auctionIndex>"', 'Show the closing price for an auction', list)
    .option('-o --oracle <token>', 'Show oracle-price')
    .option('-t, --time <hours>', 'Increase time of the blockchain in hours', parseFloat)
    .option('-m, --mine', 'Mine one block')
    .option('-B, --buy "<sell-token>,<buy-token>,<amount>[,<auctionIndex>]"', 'Buy tokens in the <sell-token>-<buy-token> auction', list)
    .option('-S, --sell "<sell-token> <buy-token> <amount>[,<auctionIndex>]"', 'Sell tokens <sell-token>-<buy-token> auction', list)
    .option('-T, --test <test-number>', 'Execute a test case (i.e. 1 is: Add tokens, wait for auction to start, fake some buyings, ...', list)

  commander.on('--help', function () {
    const examples = [
      '--now',
      '--addresses',
      '--balances',
      '--setup',
      '--setup-funding',
      '--send WETH,0.1,0xf17f52151ebef6c7334fad080c5704d77216b732',
      '--fund WETH,0.5',
      '--approve-token RDN',
      '--state RDN,WETH',
      '--deposit WETH,100',
      '--add-tokens',
      '--closing-price RDN,WETH,0',
      '--price RDN,WETH,1',
      '--oracle WETH',
      '--mine',
      '--time 0.5',
      '--time 6',
      '--buy RDN,WETH,100',
      '--sell WETH,RDN,100',
      '--test 1'
    ]

    console.log('\n\nExamples:')
    examples.forEach(example => console.log('\t %s %s', BOT_CLI_SCRIPT, example))
    console.log('')
  })

  commander.parse(process.argv)

  if (commander.now) {
    // now
    await printTime('Current time')
  } else if (commander.addresses) {
    // Addresses
    await printAddresses()
  } else if (commander.setup) {
    // Setup for testing
    await setAuctionRunningAndFundUser({})
  } else if (commander.setupFunding) {
    // Setup funding for the bot user
    await fundUser1()
  } else if (commander.send) {
    // Send tokens
    const [ token, amountString, toAddressOpc, fromAddressOpc ] = commander.send
    const amount = parseFloat(amountString)
    const fromAddress = fromAddressOpc || owner
    const toAddress = toAddressOpc || botAccount

    await dxTradeService.sendTokens({
      token,
      amount: amount * 1e18,
      fromAddress: fromAddress || owner,
      toAddress: toAddress || botAccount
    })
  } else if (commander.fund) {
    // Fund account
    const [ token, amountString, accountAddressOpt ] = commander.fund
    const amount = parseFloat(amountString)
    const accountAddress = accountAddressOpt || botAccount

    const newBalance = await dxTradeService.deposit({
      token,
      amount: amount * 1e18,
      accountAddress
    })
    debug('New Balance: %d %s', newBalance, token)
  } else if (commander.fundBots) {
    // Fund the user 1
    await fundUser1()
  } else if (commander.approveToken) {
    const token = commander.approveToken
    await auctionRepo.approveToken({ token, from: owner })
    console.log('The token %s has been approved', token)
  } else if (commander.state) {
    // State
    const [buyToken, sellToken] = commander.state
    await printState('State', { buyToken, sellToken })
  } else if (commander.deposit) {
    // deposit
    const [token, amountString] = commander.deposit
    // const amount = new BigNumber(amountString)
    const amount = parseFloat(amountString)

    await deposit({
      account: botAccount,
      token,
      amount
    })
  } else if (commander.addTokens) {
    // add tokens
    await printState('State before add tokens', {
      buyToken: 'RDN',
      sellToken: 'WETH'
    })
    await addTokens()
    await printState('State after add tokens', {
      buyToken: 'RDN',
      sellToken: 'WETH'
    })
  } else if (commander.closingPrice) {
    // closing price
    const [sellToken, buyToken, auctionIndex] = commander.closingPrice
    const closingPrice = await auctionRepo.getPastAuctionPrice({
      sellToken, buyToken, auctionIndex
    })
    console.log('Closing price: ' + fractionFormatter(closingPrice))
  } else if (commander.price) {
    // Price
    const [sellToken, buyToken, auctionIndex] = commander.price
    const price = await auctionRepo.getCurrentAuctionPrice({ sellToken, buyToken, auctionIndex })
    console.log(`Price for ${sellToken}-${buyToken} (${auctionIndex}): ${fractionFormatter(price)}`)
  } else if (commander.oracle) {
    // Oracle price
    const token = commander.oracle
    const oraclePrice = await auctionRepo.getPriceOracle({ token })
    const price = fractionFormatter(oraclePrice)
    console.log(`Oracle price for ${token}: ${price}`)
  } else if (commander.time) {
    // time
    await printTime('Time before increase time')
    await ethereumClient.increaseTime(commander.time * 60 * 60)
    await printTime(`Time after increase ${commander.time} hours`)
  } else if (commander.mine) {
    // mine
    await printTime('Time before minining: ')
    await ethereumClient.mineBlock()
    await printTime('Time after minining: ')
  } else if (commander.buy) {
    // buy
    const [sellToken, buyToken, amountString, ...extra] = commander.buy
    const auctionIndex = (extra.lenth === 1) ? extra[0] : null
    await buySell('postBuyOrder', {
      from: botAccount,
      sellToken,
      buyToken,
      amount: parseFloat(amountString),
      auctionIndex
    })
  } else if (commander.sell) {
    // sell
    const [sellToken, buyToken, amountString, ...extra] = commander.sell
    const auctionIndex = (extra.length === 1) ? extra[0] : null
    console.log('auctionIndex', extra, auctionIndex)

    await buySell('postSellOrder', {
      from: botAccount,
      sellToken,
      buyToken,
      amount: parseFloat(amountString),
      auctionIndex
    })
  } else if (commander.test) {
    const testNumber = parseInt(commander.test)

    switch (testNumber) {
      case 1:
        const sellToken = 'WETH'
        const buyToken = 'RDN'
        const ethToSell = 0.1
        // const ethToBuy = 0.4
        const rdnToSell = 150
        const rdnToBuy = 200

        const tokenPair = { sellToken, buyToken }
        const auctionIndex = await auctionRepo.getAuctionIndex(tokenPair)

        debug('*** Test 1 ***')
        await setAuctionRunningAndFundUser(tokenPair)

        debug(`[in 3s] User1 is will try to sell ${ethToSell} WETH in current \
auction - it must fail`)
        await delay(() => {
          return buySell('postSellOrder', {
            from: user1,
            sellToken,
            buyToken,
            amount: ethToSell
          }).catch(error => {
            debug('Nice! The postSellOrder failed for the current auction, because it was RUNNING: ' + error.toString())
          })
        }, 3000)

        debug('[in 3s] User1 is will try to sell %d WETH in next auction (%d) - it must succed',
          ethToSell, auctionIndex + 1)
        await delay(() => {
          return buySell('postSellOrder', {
            from: user1,
            sellToken,
            buyToken,
            amount: ethToSell,
            auctionIndex: auctionIndex + 1
          }).then(() => {
            debug(`Nice! The postSellOrder succeded for the next auction. We've \
sold ${ethToSell} WETH for auction ${auctionIndex + 1}`)
          })
        }, 3000)

        debug('[in 3s] User1 is will try to sell %d RDN in next auction (%d) - it must succed',
          rdnToSell, auctionIndex + 1)
        await delay(() => {
          return buySell('postSellOrder', {
            from: user1,
            sellToken: buyToken,
            buyToken: sellToken,
            amount: rdnToSell,
            auctionIndex: auctionIndex + 1
          }).then(() => {
            debug(`Nice! The postSellOrder succeded for the next auction. We've \
sold ${rdnToSell} RDN for auction %d${auctionIndex + 1}`)
          })
        }, 3000)

        debug('[in 3s] User1 is buying in WETH-RDN bidding %d RDN', rdnToBuy)
        await delay(() => {
          return buySell('postBuyOrder', {
            from: user1,
            sellToken,
            buyToken,
            amount: rdnToBuy
          }).then(() => {
            debug("Nice! The postBuyOrder, we've bought %d RDN", rdnToBuy)
          })
        }, 3000)

        await printState('Final state', { buyToken, sellToken })
        debug('Test 1 finished! Well done')
        break
      default:
        throw new Error('Unknown test case: ' + testNumber)
    }
  } else {
    // help
    commander.help()
  }
}
