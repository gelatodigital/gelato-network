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
      { from: accounts[0] }
    );
  } else if (network.startsWith("rinkeby")) {
    console.log(`\n\tDeploying ${CONTRACT_NAME} to RINKEBY\n`);
    gelatoCore = await GelatoCore.deployed();
    dutchX = await DutchExchangeProxy.at(
      "0xaAEb2035FF394fdB2C879190f95e7676f1A9444B"
    );
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
  } else {
    console.log("Do later");
  }
  // Print deployed contract address to console
  const deployedContract = await TriggerDutchXAuctionCleared.deployed();
  console.log(`
        Deployed ${CONTRACT_NAME} instance at:
        ================================
        ${deployedContract.address}`);
};
