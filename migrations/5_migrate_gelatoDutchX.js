/* global artifacts */
/* eslint no-undef: "error" */

// Set Gelato Contract as truffle artifact
const GelatoCore = artifacts.require("GelatoCore");
const GelatoDutchX = artifacts.require("GelatoDutchX");
const INTERFACE_MAX_GAS = 500000; // sell and withdraw claims benchmarking
const INTERFACE_GAS_PRICE = 0; // defaults to gelatoCore.recommendedGasPriceForInterface
// Rinkeby
const RINKEBY_DEPLOYER = "0xb9ed66dc0BdD361c94ed83fBD0fBC761d260c1A4"; // Luis
const DX_PROXY_RINKEBY_ADDRESS = "0xaAEb2035FF394fdB2C879190f95e7676f1A9444B";

module.exports = async function(deployer, network, accounts) {
  // Get previously deployed gelato Core
  const gelatoCore = await GelatoCore.deployed();

  // For development (ganache)
  if (network.startsWith("dev")) {
    const ganacheInterfaceDeployer = accounts[0];
    // get the DutchXProxy
    const DutchExchangeProxy = artifacts.require("DutchExchangeProxy");
    const dxProxy = await DutchExchangeProxy.deployed();
    console.log(`
          Deploying GelatoDutchX.sol with
          ================================================
          Owner:       ${ganacheInterfaceDeployer}
          GelatoCore:  ${gelatoCore.address}
          DutchXProxy: ${dxProxy.address}
          interfaceMaxGas:   ${INTERFACE_MAX_GAS}
          interfaceGasPrice: ${INTERFACE_GAS_PRICE} (0 = gelatoCore default)`);
    await deployer.deploy(
      GelatoDutchX,
      gelatoCore.address,
      dxProxy.address,
      INTERFACE_MAX_GAS,
      INTERFACE_GAS_PRICE,
      {
        from: ganacheInterfaceDeployer
      }
    );
  } else if (network.startsWith("rinkeby")) {
    // Log the GelatoDutchX constructor params
    console.log(`
          Deploying GelatoDutchX.sol with
          ================================================
          Owner:       ${RINKEBY_DEPLOYER}
          GelatoCore:  ${gelatoCore.address}
          DutchXProxy: ${DX_PROXY_RINKEBY_ADDRESS}
          interfaceMaxGas:   ${INTERFACE_MAX_GAS}
          interfaceGasPrice: ${INTERFACE_GAS_PRICE} (0 = gelatoCore default)`);
    await deployer.deploy(
      GelatoDutchX,
      gelatoCore.address,
      DX_PROXY_RINKEBY_ADDRESS,
      INTERFACE_MAX_GAS,
      INTERFACE_GAS_PRICE,
      { from: RINKEBY_DEPLOYER }
    );
  }
  // Log the address of deployed GelatoDutchX
  const gelatoDutchX = await GelatoDutchX.deployed();
  console.log(`
        Deployed GelatoDutchX instance at:
        ==================================================
        ${gelatoDutchX.address}`);
};
