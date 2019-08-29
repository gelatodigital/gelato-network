/* global artifacts */
/* eslint no-undef: "error" */

// Set Gelato Contract as truffle artifact
const GelatoCore = artifacts.require("GelatoCore");
const GelatoDutchX = artifacts.require("GelatoDutchX");
// const DutchExchangeProxy = artifacts.require("DutchExchangeProxy");
const INTERFACE_MAX_GAS = 500000; // sell and withdraw claims benchmarking
const INTERFACE_GAS_PRICE = 0; // defaults to gelatoCore.recommendedGasPriceForInterface

module.exports = async function(deployer, network, accounts) {
  // const _coreDeployer = accounts[0];
  // const interfaceDeployer = accounts[0];

  const gelatoCore = await GelatoCore.deployed();

  // Deploy GelatoDutchX interface
  // Make sure the proxy is deployed
  // const dxProxy = await DutchExchangeProxy.deployed();
  console.log(`
        Deploying GelatoDutchX.sol with
        ================================================
        Owner: ${interfaceDeployer}
        GelatoCore: ${gelatoCore.address}
        DutchXProxy: ${dxProxy.address}
        interfaceMaxGas: ${INTERFACE_MAX_GAS}
        interfaceGasPrice: ${INTERFACE_GAS_PRICE} (0 = gelatoCore default)`);
  await deployer.deploy(
    GelatoDutchX,
    gelatoCore.address,
    // dxProxy.address,
    INTERFACE_MAX_GAS,
    INTERFACE_GAS_PRICE
    /*{
      from: interfaceDeployer
    }*/
  );

  const gelatoDutchX = await GelatoDutchX.deployed();
  console.log(`
        Deployed GelatoDutchX instance at:
        ==================================================
        ${gelatoDutchX.address}`);
};
