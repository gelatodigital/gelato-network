/* global artifacts */
/* eslint no-undef: "error" */

// Set Gelato Contract as truffle artifact
const GelatoCore = artifacts.require('GelatoCore');
const GelatoDutchX = artifacts.require('GelatoDutchX');
const DutchExchangeProxy = artifacts.require('DutchExchangeProxy')

module.exports = async function (deployer, network, accounts)

{
    const account = accounts[0]

    // Make sure the proxy is deployed
    const dxProxy = await DutchExchangeProxy.deployed()

    // Deploy the Safe
    console.log('Deploying Gelato.sol with %s as the owner and %s as the DutchExchange contract', account, dxProxy.address)

    await deployer.deploy(GelatoCore)
    const gelatoCore = await GelatoCore.deployed()
    await deployer.deploy(GelatoDutchX, gelatoCore, dxProxy.address)
}