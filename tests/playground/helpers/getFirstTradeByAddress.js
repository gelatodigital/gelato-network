const debug = require('debug')('DEBUG-dx-service:tests:helpers:watchEthereumEvents')
debug.log = console.debug.bind(console)

const testSetup = require('../../helpers/testSetup')
const ethereumEventHelper = require('../../../src/helpers/ethereumEventHelper')
const BATCH_SIZE = 100000

testSetup()
  .then(run)
  .catch(console.error)


async function getFirstTradeByAddress ({ firstTrades, fromBlock, toBlock, filters, dx }) {
  const events = await ethereumEventHelper
    .filter({
      contract: dx,
      events: [
        'NewSellOrder',
        'NewBuyOrder'
      ],
      fromBlock,
      toBlock,
      filters
    })

  return events
    .sort((eventA, eventB) => eventA.blockNumber - eventB.blockNumber)
    .reduce((acc, event) => {
      const user = event.args.user
      const userAlreadyTraded = acc.some(e => user === e.args.user)
      // console.log('event: %o', event)
      if (!userAlreadyTraded) {
        acc.push(event)
      }
      return acc
    }, firstTrades)
}

async function run ({
  dx,
  ethereumClient
}) {
  const latest = await ethereumClient.getBlockNumber()
  const startBlock = 2547437 // latest - 10000 // 5875590 (mainnet deployment) // 2547437 (rinkeby deployment)
  let firstTrades = []
  let count = 1
  for (var i = startBlock; i <= latest; i += BATCH_SIZE) {
    const fromBlock = i
    const toBlock = Math.min(i + BATCH_SIZE - 1, latest)
    debug('Batch %d: Get blocks between %d and %d', count, fromBlock, toBlock)
    firstTrades = await getFirstTradeByAddress({
      firstTrades,
      fromBlock,
      toBlock,
      dx
    })
    count++
  }

  if (firstTrades.length > 0) {
    debug('Found %d different user', firstTrades.length)
    firstTrades.forEach(trade => {
      debug('  User: %s. Data: %o', trade.args.user, {
        event: trade.event,
        tx: trade.transactionHash,
        sellToken: trade.args.sellToken,
        buyToken: trade.args.buyToken,
        auctionIndex: trade.args.auctionIndex.toNumber(),
        amount: trade.args.amount.div(1e18).toNumber()
      })
    })
  } else {
    debug('No trades were found between blocks %d and %d', startBlock, latest)
  }

  await ethereumClient.stop()
}
