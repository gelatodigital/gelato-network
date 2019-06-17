const printMarketDetails = require('./printMarketDetails')

async function printState ({ logger, message, tokenPair, now, marketDetails }) {
  const { sellToken, buyToken } = tokenPair

  logger.info(`\n**********  ${message}  **********\n`)
  printMarketDetails({ logger, sellToken, buyToken, now, marketDetails })
  logger.info('\n**************************************\n\n')
}

module.exports = printState
