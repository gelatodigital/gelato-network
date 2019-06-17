const conf = require('../../../conf')

let dxPriceOracleRepo

module.exports = async () => {
  if (!dxPriceOracleRepo) {
    dxPriceOracleRepo = await _createDxPriceOracleRepo()
  }
  return dxPriceOracleRepo
}

async function _createDxPriceOracleRepo () {
  // Get factory
  const {
    Factory: DxOraclePriceRepo,
    factoryConf: dxOraclePriceRepoConf
  } = conf.getFactory('DX_PRICE_ORACLE_REPO')

  // Get contracts
  const loadContracts = require('../../loadContracts')
  const contracts = await loadContracts()

  const {
    CACHE
  } = conf

  return new DxOraclePriceRepo({
    contracts,

    // Cache
    cacheConf: CACHE,

    // Override config
    ...dxOraclePriceRepoConf
  })
}
