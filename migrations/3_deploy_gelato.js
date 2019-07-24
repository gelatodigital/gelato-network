/* global artifacts */
/* eslint no-undef: "error" */

// Set Gelato Contract as truffle artifact
const GelatoCore = artifacts.require("GelatoCore");
const GelatoDXSplitSellAndWithdraw = artifacts.require(
  "GelatoDXSplitSellAndWithdraw"
);
const DutchExchangeProxy = artifacts.require("DutchExchangeProxy");
const mockExchange = artifacts.require("DutchXMock");
// GelatoCore constructor params
const GELATO_GAS_PRICE = web3.utils.toWei("5", "gwei");

module.exports = async function(deployer, network, accounts) {
  const _deployer = accounts[0];

  // Make sure the proxy is deployed
  const dxProxy = await DutchExchangeProxy.deployed();

  // Deploy GelatoCore with gelatoGasPrice
  console.log(`
            Deploying GelatoCore.sol with
            =============================
            Owner: ${_deployer}
            DutchXProxy: ${dxProxy.address}
            gelatoGasPrice: ${GELATO_GAS_PRICE}`);
  await deployer.deploy(GelatoCore, GELATO_GAS_PRICE);

  const gelatoCore = await GelatoCore.deployed();
  console.log(`
            Deployed GelatoCore instance at:
            ================================
            ${gelatoCore.address}`);

  // Deploy GelatoDutchX interface
  console.log(`
            Deploying GelatoDXSplitSellAndWithdraw.sol with
            ================================================
            Owner: ${_deployer}
            GelatoCore: ${gelatoCore.address}
            DutchXProxy: ${dxProxy.address}`);
  await deployer.deploy(
    GelatoDXSplitSellAndWithdraw,
    gelatoCore.address,
    dxProxy.address
  );

  const gelatoDXSplitSellAndWithdraw = await GelatoDXSplitSellAndWithdraw.deployed();
  console.log(`
            Deployed GelatoDXSplitSellAndWithdraw instance at:
            ==================================================
            ${gelatoDXSplitSellAndWithdraw.address}`);
};
