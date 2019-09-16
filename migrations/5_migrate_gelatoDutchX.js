/* global artifacts */
/* eslint no-undef: "error" */

// Set Gelato Contract as truffle artifact
const GelatoCore = artifacts.require("GelatoCore");
const GelatoDutchX = artifacts.require("GelatoDutchX");
const DEPOSITANDSELLGAS = 500000;
const WITHDRAWGAS = 200000;
const INTERFACE_MAX_GAS = DEPOSITANDSELLGAS + WITHDRAWGAS;
const INTERFACE_GAS_PRICE = 0; // defaults to gelatoCore.recommendedGasPriceForInterface
// Rinkeby
const DX_PROXY_RINKEBY_ADDRESS = "0xaAEb2035FF394fdB2C879190f95e7676f1A9444B";

module.exports = async function(deployer, network, accounts) {
  // Get previously deployed gelato Core
  const gelatoCore = await GelatoCore.deployed();

  // For development (ganache)
  if (network.startsWith("dev")) {
    console.log("\n\tDeploying Gelato DutchX to Ganache\n")
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
      INTERFACE_GAS_PRICE,
      DEPOSITANDSELLGAS,
      WITHDRAWGAS,
      {
        from: ganacheInterfaceDeployer
      }
    );
  } else if (network.startsWith("rinkeby")) {
    console.log("\n\tDeploying Gelato DutchX to Rinkeby\n")
    // Log the GelatoDutchX constructor params
    console.log(`
          Deploying GelatoDutchX.sol with
          ================================================
          Owner:       ${accounts[0]}
          GelatoCore:  ${gelatoCore.address}
          DutchXProxy: ${DX_PROXY_RINKEBY_ADDRESS}
          interfaceMaxGas:   ${DEPOSITANDSELLGAS + DEPOSITANDSELLGAS}
          interfaceGasPrice: ${INTERFACE_GAS_PRICE} (0 = gelatoCore default)`);
    await deployer.deploy(
      GelatoDutchX,
      gelatoCore.address,
      DX_PROXY_RINKEBY_ADDRESS,
      INTERFACE_GAS_PRICE,
      DEPOSITANDSELLGAS,
      WITHDRAWGAS
    );
  }
  // Log the address of deployed GelatoDutchX
  const gelatoDutchX = await GelatoDutchX.deployed();
  console.log(`
        Deployed GelatoDutchX instance at:
        ==================================================
        ${gelatoDutchX.address}`);
};
