const debug = require('debug')('DEBUG-dx-services:util:getContractVersions')
debug.log = console.debug.bind(console)

function getContractVersions () {
  let packageJson = require('../../package.json')
  debug('[getContractVersions] Dx Contracts version %s', packageJson.dependencies['@gnosis.pm/dx-contracts'])
  debug('[getContractVersions] Dx Price Oracle version %s', packageJson.dependencies['@gnosis.pm/dx-price-oracle'])
  debug('[getContractVersions] Owl Token version %s', packageJson.dependencies['@gnosis.pm/owl-token'])
  debug('[getContractVersions] Util contracts version %s', packageJson.dependencies['@gnosis.pm/util-contracts'])

  return {
    dxContracts: packageJson.dependencies['@gnosis.pm/dx-contracts'],
    dxPriceOracle: packageJson.dependencies['@gnosis.pm/dx-price-oracle'],
    owlToken: packageJson.dependencies['@gnosis.pm/owl-token'],
    utilContracts: packageJson.dependencies['@gnosis.pm/util-contracts']
  }
}

module.exports = getContractVersions
