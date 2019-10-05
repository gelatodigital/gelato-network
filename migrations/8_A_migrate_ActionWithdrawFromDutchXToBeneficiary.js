/* global artifacts */
/* eslint no-undef: "error" */

const CONTRACT_NAME = "ActionWithdrawFromDutchXToBeneficiary";
// Artifacts
const ActionWithdrawFromDutchXToBeneficiary = artifacts.require(
  "ActionWithdrawFromDutchXToBeneficiary"
);
const GelatoCore = artifacts.require("GelatoCore");
const DutchExchangeProxy = artifacts.require("DutchExchangeProxy");

// Constructor params
let gelatoCore;
let dutchX;
const ACTION_SIGNATURE =
  "withdrawFromDutchXToExecutionClaimOwner(uint256,address,address,address,address,uint256,uint256)";
const ACTION_GAS_STIPEND = "200000";

module.exports = async function(deployer, network, accounts) {
  if (network.startsWith("dev")) {
    console.log(`\n\tDeploying ${CONTRACT_NAME} to ganache\n`);
    const ganacheCoreDeployer = accounts[0]; // Ganache account
    // Constructor params
    gelatoCore = await GelatoCore.deployed();
    dutchX = await DutchExchangeProxy.deployed();
    // Log constructor params to console
    console.log(`
          Deploying ${CONTRACT_NAME} with
          =============================
          GelatoCore:        ${gelatoCore.address}
          DutchX Proxy:      ${dutchX.address}
          ActionGasStipend:  ${ACTION_GAS_STIPEND}
          ActionSignature:   ${ACTION_SIGNATURE}
    `);
    // Deploy with constructor params
    await deployer.deploy(
      ActionWithdrawFromDutchXToBeneficiary,
      gelatoCore.address,
      dutchX.address,
      ACTION_SIGNATURE,
      ACTION_GAS_STIPEND,
      { from: ganacheCoreDeployer }
    );
  } else {
    console.log(`\n\tDeploying ${CONTRACT_NAME} to live net\n`);
    // Constructor params
    gelatoCore = await GelatoCore.deployed();
    dutchX = await DutchExchangeProxy.deployed();
    console.log(`
          Deploying ${CONTRACT_NAME} with
          =============================
          GelatoCore:        ${gelatoCore.address}
          DutchX Proxy:      ${dutchX.address}
          ActionGasStipend:  ${ACTION_GAS_STIPEND}
          ActionSignature:   ${ACTION_SIGNATURE}
    `);
    await deployer.deploy(
      ActionWithdrawFromDutchXToBeneficiary,
      gelatoCore.address,
      dutchX.address,
      ACTION_SIGNATURE,
      ACTION_GAS_STIPEND
    );
  }
  // Print deployed contract address to console
  const deployedContract = await ActionWithdrawFromDutchXToBeneficiary.deployed();
  console.log(`
        Deployed ${CONTRACT_NAME} instance at:
        ================================
        ${deployedContract.address}`);
};
