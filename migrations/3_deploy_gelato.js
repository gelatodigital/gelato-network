/* global artifacts */
/* eslint no-undef: "error" */

// Set Gelato Contract as truffle artifact
const GelatoCore = artifacts.require('GelatoCore');
const GelatoDutchX = artifacts.require('GelatoDutchX');
const DutchExchangeProxy = artifacts.require('DutchExchangeProxy');

// GelatoCore constructor params
const GELATO_GAS_PRICE = web3.utils.toWei('5', 'gwei');

module.exports = async function (deployer, network, accounts) {
    const _deployer = accounts[0];

    // Make sure the proxy is deployed
    const dxProxy = await DutchExchangeProxy.deployed();

    // Deploy GelatoCore with gelatoGasPrice
    console.log(`
    Deploying GelatoCore.sol with
    Owner: ${_deployer}
    DutchXProxy: ${dxProxy.address}
    gelatoGasPrice: ${GELATO_GAS_PRICE}`
    );
    await deployer.deploy(GelatoCore, GELATO_GAS_PRICE);
    const gelatoCore = await GelatoCore.deployed();

    // Deploy GelatoDutchX interface
    console.log(`
    Deploying GelatoDutchX.sol with
    Owner: ${_deployer}
    GelatoCore: ${gelatoCore.address}
    DutchXProxy: ${dxProxy.address}`
    );
    await deployer.deploy(GelatoDutchX, gelatoCore.address, dxProxy.address);

    const gelatoDutchX = await GelatoDutchX.deployed();
    console.log(`
    Deployed GelatoDutchX instance at:
    ${gelatoDutchX.address}`
    );
}