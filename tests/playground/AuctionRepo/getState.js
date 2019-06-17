const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

const stateInfoProps = ['auctionIndex', 'auctionStart']

const auctionProps = [
  'buyVolume',
  'sellVolume',
  'closingPrice',
  'isClosed',
  'isTheoreticalClosed'
]

// Run:
//    DEBUG=*:AuctionRepoImpl node getState.js
async function run ({
  auctionRepo,
  printProps,
  fractionFormatter
}) {
  const sellToken = 'WETH'
  const buyToken = 'RDN'
  const state = await auctionRepo.getState({ sellToken, buyToken })
  const stateInfo = await auctionRepo.getStateInfo({ sellToken, buyToken })

  const formatters = {
    closingPrice: fractionFormatter
  }

  console.log(`Token:\n\t${sellToken}-${buyToken}`)
  console.log(`State:\n\t${state}`)

  console.log('\nState info:')
  printProps('\t', stateInfoProps, stateInfo)

  console.log('\nAuction:')
  printProps('\t', auctionProps, stateInfo.auction, formatters)

  console.log('\nOpposite Auction:')
  printProps('\t', auctionProps, stateInfo.auctionOpp, formatters)
}
