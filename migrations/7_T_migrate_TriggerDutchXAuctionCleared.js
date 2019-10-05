/* global artifacts */
/* eslint no-undef: "error" */

const CONTRACT_NAME = "TriggerDutchXAuctionCleared";

// Artifacts
const TriggerDutchXAuctionCleared = artifacts.require(
  "TriggerDutchXAuctionCleared"
);
const GelatoCore = artifacts.require("GelatoCore");
const DutchExchangeProxy = artifacts.require("DutchExchangeProxy");

// Constructor params
let gelatoCore;
const TRIGGER_SIGNATURE = "fired(address,address,uint256)";
let dutchX;

module.exports = async function(deployer, network, accounts) {
  if (network.startsWith("dev")) {
    console.log(`\n\tDeploying ${CONTRACT_NAME} to ganache\n`);
    const ganacheCoreDeployer = accounts[0]; // Ganache account
    gelatoCore = await GelatoCore.deployed();
    dutchX = await DutchExchangeProxy.deployed();
    // Log constructor params to console
    console.log(`
          Deploying ${CONTRACT_NAME} with
          =============================
          GelatoCore:        ${gelatoCore.address}
          TriggerSignature:  ${TRIGGER_SIGNATURE}
          DutchX Proxy:      ${dutchX.address}
    `);
    // Deploy with constructor params
    await deployer.deploy(
      TriggerDutchXAuctionCleared,
      gelatoCore.address,
      TRIGGER_SIGNATURE,
      dutchX.address,
      { from: ganacheCoreDeployer }
    );
  } else {
    console.log(`\n\tDeploying ${CONTRACT_NAME} to live net\n`);
    gelatoCore = await GelatoCore.deployed();
    dutchX = await DutchExchangeProxy.deployed();
    console.log(`
          Deploying ${CONTRACT_NAME} with
          =============================
          GelatoCore:        ${gelatoCore.address}
          TriggerSignature:  ${TRIGGER_SIGNATURE}
          DutchX Proxy:      ${dutchX.address}
    `);
    await deployer.deploy(
      TriggerDutchXAuctionCleared,
      gelatoCore.address,
      TRIGGER_SIGNATURE,
      dutchX.address
    );
  }
  // Print deployed contract address to console
  const deployedContract = await TriggerDutchXAuctionCleared.deployed();
  console.log(`
        Deployed ${CONTRACT_NAME} instance at:
        ================================
        ${deployedContract.address}`);
};
