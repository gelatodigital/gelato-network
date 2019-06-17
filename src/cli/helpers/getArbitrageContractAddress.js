const conf = require('../../../conf')

function getArbitrageContractAddress () {
  const {
    ARBITRAGE_CONTRACT_ADDRESS
  } = conf

  return ARBITRAGE_CONTRACT_ADDRESS
}

module.exports = getArbitrageContractAddress
