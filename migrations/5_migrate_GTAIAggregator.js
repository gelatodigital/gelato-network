/* global artifacts */
/* eslint no-undef: "error" */

const CONTRACT_NAME = "GTAIAggregator";

// Artifacts
const GTAIAggregator = artifacts.require("GTAIAggregator");
const GelatoCore = artifacts.require("GelatoCore");

// Constructor params
let gelatoCore;
const EXECUTION_CLAIM_LIFESPAN = "7776000"; // 3 months in seconds
const GTAI_GAS_PRICE = web3.utils.toWei("5", "gwei");
const AUTOMATIC_TOPUP_AMOUNT = web3.utils.toWei("0.5", "ether");

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
      ExecutionClaimLifespan: ${EXECUTION_CLAIM_LIFESPAN}
      GTAI gas price:         ${web3.utils.fromWei(GTAI_GAS_PRICE, "ether")} ETH
      AutomaticTopUp amount:  ${web3.utils.fromWei(
        AUTOMATIC_TOPUP_AMOUNT,
        "ether"
      )} ETH
    `);
    // Deploy with constructor params
    await deployer.deploy(
      GTAIAggregator,
      gelatoCore.address,
      EXECUTION_CLAIM_LIFESPAN,
      GTAI_GAS_PRICE,
      AUTOMATIC_TOPUP_AMOUNT,
      { from: ganacheCoreDeployer }
    );
  } else {
    console.log(`\n\tDeploying ${CONTRACT_NAME} to live net\n`);
    gelatoCore = await GelatoCore.deployed();
    console.log(`
          Deploying ${CONTRACT_NAME} with
          =============================
          Owner:                  HOW TO GET CURRENT PROVIDER SELECTED ADDRESS?
          GelatoCore:             ${gelatoCore.address}
          ExecutionClaimLifespan: ${EXECUTION_CLAIM_LIFESPAN}
          GTAI gas price:         ${web3.utils.fromWei(
            GTAI_GAS_PRICE,
            "ether"
          )} ETH
          AutomaticTopUp amount:  ${web3.utils.fromWei(
            AUTOMATIC_TOPUP_AMOUNT,
            "ether"
          )} ETH
    `);
    await deployer.deploy(
      GTAIAggregator,
      gelatoCore.address,
      EXECUTION_CLAIM_LIFESPAN,
      GTAI_GAS_PRICE,
      AUTOMATIC_TOPUP_AMOUNT
    );
  }
  // Print deployed contract address to console
  const deployedContract = await GTAIAggregator.deployed();
  console.log(`
        Deployed ${CONTRACT_NAME} instance at:
        ================================
        ${deployedContract.address}`);
};
