/* global artifacts */
/* eslint no-undef: "error" */
const CONTRACT_NAME = "TriggerTimestampPassed";
// Artifacts
const TriggerTimestampPassed = artifacts.require("TriggerTimestampPassed");
const GelatoCore = artifacts.require("GelatoCore");

// constructor params
let gelatoCore;
const TRIGGER_SIGNATURE = "fired(uint256)";

module.exports = async function(deployer, network, accounts) {
  if (network.startsWith("dev")) {
    console.log(`\n\tDeploying ${CONTRACT_NAME} to ganache\n`);
    const ganacheCoreDeployer = accounts[0]; // Ganache account
    gelatoCore = await GelatoCore.deployed();
    // Log constructor params to console
    console.log(`
          Deploying ${CONTRACT_NAME} with
          =============================
          GelatoCore:        ${gelatoCore.address}
          TriggerSignature:  ${TRIGGER_SIGNATURE}
          `);
    // Deploy with constructor params
    await deployer.deploy(
      TriggerTimestampPassed,
      gelatoCore.address,
      TRIGGER_SIGNATURE,
      {
        from: ganacheCoreDeployer
      }
    );
  } else {
    console.log(`\n\tDeploying ${CONTRACT_NAME} to live net\n`);
    gelatoCore = await GelatoCore.deployed();
    console.log(`
          Deploying ${CONTRACT_NAME} with
          =============================
          GelatoCore:        ${gelatoCore.address}
          TriggerSignature:  ${TRIGGER_SIGNATURE}
          `);
    await deployer.deploy(
      TriggerTimestampPassed,
      gelatoCore.address,
      TRIGGER_SIGNATURE
    );
  }
  // Print deployed contract address to console
  const deployedContract = await TriggerTimestampPassed.deployed();
  console.log(`
        Deployed ${CONTRACT_NAME} instance at:
        ================================
        ${deployedContract.address}`);
};
