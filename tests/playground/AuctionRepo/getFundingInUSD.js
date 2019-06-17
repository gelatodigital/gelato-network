const testSetup = require('../../helpers/testSetup')
testSetup()
  .then(run)
  .catch(console.error)

function run ({
  auctionRepo
}) {
  const tokenA = 'RDN'
  const tokenB = 'WETH'
  const auctionIndex = 1

  return auctionRepo
    .getFundingInUSD({ tokenA, tokenB, auctionIndex })
    .then(({ fundingA, fundingB }) => {
      console.log(`The funding un USD for auction ${auctionIndex} of \
${tokenA}-${tokenB} pair is:
\t* ${tokenA}: ${fundingA} USD
\t* ${tokenB}: ${fundingB} USD`)
    })
    .catch(console.error)
}
