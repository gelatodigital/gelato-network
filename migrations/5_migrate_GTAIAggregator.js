/* global artifacts */
/* eslint no-undef: "error" */

const CONTRACT_NAME = "GTAIAggregator";

// Artifacts
const GTAIAggregator = artifacts.require("GTAIAggregator");
const GelatoCore = artifacts.require("GelatoCore");

// Constructor params
let gelatoCore;
const GTAI_GAS_PRICE = web3.utils.toWei("5", "gwei");

module.exports = async function(deployer, network, accounts) {
  if (network.startsWith("dev")) {
    console.log(`\n\tDeploying ${CONTRACT_NAME} to ganache\n`);
    gelatoCore = await GelatoCore.deployed();
    // Log constructor params to console
    console.log(`
      Deploying ${CONTRACT_NAME} with
      =============================
      Owner:                  ${accounts[0]}
      GelatoCore:             ${gelatoCore.address}
      GTAI gas price:         ${web3.utils.fromWei(GTAI_GAS_PRICE, "ether")} ETH
    `);
    // Deploy with constructor params
    await deployer.deploy(GTAIAggregator, gelatoCore.address, GTAI_GAS_PRICE, {
      from: accounts[0]
    });
  } else {
    console.log(`\n\tDeploying ${CONTRACT_NAME} to live net\n`);
    gelatoCore = await GelatoCore.deployed();
    console.log(`
          Deploying ${CONTRACT_NAME} with
          =============================
          Owner:                  HOW TO GET CURRENT PROVIDER SELECTED ADDRESS?
          GelatoCore:             ${gelatoCore.address}
          GTAI gas price:         ${web3.utils.fromWei(
            GTAI_GAS_PRICE,
            "ether"
          )} ETH
    `);
    await deployer.deploy(GTAIAggregator, gelatoCore.address, GTAI_GAS_PRICE);
  }
  // Print deployed contract address to console
  const deployedContract = await GTAIAggregator.deployed();
  console.log(`
        Deployed ${CONTRACT_NAME} instance at:
        ================================
        ${deployedContract.address}`);
};
