const debug = require('debug')('DEBUG-dx-service:tests:helpers:watchEthereumEvents')
debug.log = console.debug.bind(console)

const testSetup = require('../../helpers/testSetup')
const ethereumEventHelper = require('../../../src/helpers/ethereumEventHelper')

testSetup()
  .then(run)
  .catch(console.error)

function run ({
  dx,
  botAccount
}) {
  const auctionIndex = process.env.INDEX || null

  ethereumEventHelper
    .filter({
      contract: dx,
      events: [
        'AuctionCleared'
      ],
      fromBlock: 0,
      toBlock: -5
    })
    .then(events => {
      debug('%d events:', events.length)
      events
        .filter(event => auctionIndex == null || event.args.auctionIndex.equals(auctionIndex))
        .forEach(event => {
          const { event: eventName, blockNumber } = event
          const { sellToken, buyToken, auctionIndex, sellVolume, buyVolume } = event.args

          debug(`\t[blockNumber=${blockNumber}] ${eventName}:
  \t\t- Auction Index: ${auctionIndex}
  \t\t- Token Pair: ${sellToken}-${buyToken}
  \t\t- Buy Volume: ${buyVolume}
  \t\t- Sell Volume: ${sellVolume}\n`)
        })
    })
    .catch(console.error)
}
