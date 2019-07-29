/* global artifacts, web3 */
/* eslint no-undef: "error" */

const migrationsDx = require('@gnosis.pm/dx-contracts/src/migrations-truffle-5')
const migrateArbitrage = require('@gnosis.pm/dx-uniswap-arbitrage/src/migrations-truffle-5/2_deploy_uniswap.js')

function migrate (deployer, network, accounts) {
  const TokenRDN = artifacts.require('TokenRDN')
  const TokenOMG = artifacts.require('TokenOMG')
  const DxPriceOracle = artifacts.require('DutchXPriceOracle')

  const deployParams = {
    artifacts,
    deployer,
    network,
    accounts,
    web3,
    initialTokenAmount: process.env.GNO_TOKEN_AMOUNT,
    gnoLockPeriodInHours: process.env.GNO_LOCK_PERIOD_IN_HOURS,
    thresholdNewTokenPairUsd: process.env.GNO_LOCK_PERIOD_IN_HOURS,
    thresholdAuctionStartUsd: process.env.GNO_LOCK_PERIOD_IN_HOURS
  }

  deployer
    .then(() => migrationsDx(deployParams))
    .then(() => deployer.deploy(TokenRDN, accounts[0]))
    .then(() => deployer.deploy(TokenOMG, accounts[0]))
  // Get dependencies to deploy DutchXPriceOracle
  const {
    EtherToken,
    DutchExchangeProxy
  } = _getDependencies(artifacts, network, deployer)

  // Deploy DutchXPriceOracle
  deployer
    .then(() => Promise.all([
      EtherToken.deployed(),
      DutchExchangeProxy.deployed()
    ]))
    .then(() => deployer.deploy(DxPriceOracle, DutchExchangeProxy.address, EtherToken.address))
    .then(() => {
      deployParams.DutchExchangeProxy = DutchExchangeProxy.address
      return migrateArbitrage(deployParams)
    })
}

function _getDependencies (artifacts, network, deployer) {
  let EtherToken, DutchExchangeProxy
  if (network === 'development') {
    EtherToken = artifacts.require('EtherToken')
    DutchExchangeProxy = artifacts.require('DutchExchangeProxy')
  } else {
    const contract = require('truffle-contract')
    EtherToken = contract(require('@gnosis.pm/util-contracts/build/contracts/EtherToken'))
    EtherToken.setProvider(deployer.provider)
    DutchExchangeProxy = contract(require('@gnosis.pm/dx-contracts/build/contracts/DutchExchangeProxy'))
    DutchExchangeProxy.setProvider(deployer.provider)
  }

  return { EtherToken, DutchExchangeProxy }
}

module.exports = migrate
