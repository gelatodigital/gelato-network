/* global artifacts */
/* eslint no-undef: "error" */

const CONTRACT_NAME = "ActionChainedDutchXSellMintWithdraw";
// Artifacts
const ActionChainedDutchXSellMintWithdraw = artifacts.require(
  "ActionChainedDutchXSellMintWithdraw"
);
const GelatoCore = artifacts.require("GelatoCore");
const DutchExchangeProxy = artifacts.require("DutchExchangeProxy");
const GTAIAggregator = artifacts.require("GTAIAggregator");
const TriggerDutchXAuctionCleared = artifacts.require(
  "TriggerDutchXAuctionCleared"
);
const ActionWithdrawFromDutchXToBeneficiary = artifacts.require(
  "ActionWithdrawFromDutchXToBeneficiary"
);

// Constructor params
let gelatoCore;
let dutchX;
const ACTION_GAS_STIPEND = "500000";
// Minting GTAI
let gtaiAggregator;
// Chained Trigger
let triggerDutchXAuctionCleared;
// Chained Action
let actionWithdrawFromDutchXToBeneficiary;

module.exports = async function(deployer, network, accounts) {
  if (network.startsWith("dev")) {
    console.log(`\n\tDeploying ${CONTRACT_NAME} to ganache\n`);
    const ganacheCoreDeployer = accounts[0]; // Ganache account
    // Constructor params
    gelatoCore = await GelatoCore.deployed();
    dutchX = await DutchExchangeProxy.deployed();
    gtaiAggregator = await GTAIAggregator.deployed();
    triggerDutchXAuctionCleared = await TriggerDutchXAuctionCleared.deployed();
    actionWithdrawFromDutchXToBeneficiary = await ActionWithdrawFromDutchXToBeneficiary.deployed();
    // Log constructor params to console
    console.log(`
          Deploying ${CONTRACT_NAME} with
          =============================
          GelatoCore:        ${gelatoCore.address}
          DutchX Proxy:      ${dutchX.address}
          Action Gas Stipend: ${ACTION_GAS_STIPEND}
          GTAI Aggregator:   ${gtaiAggregator.address}
          TriggerDutchXAuctionCleared: ${triggerDutchXAuctionCleared.address}
          ActionWithdrawFromDutchXToBeneficiary: ${actionWithdrawFromDutchXToBeneficiary.address}
    `);
    // Deploy with constructor params
    await deployer.deploy(
      ActionChainedDutchXSellMintWithdraw,
      gelatoCore.address,
      dutchX.address,
      ACTION_GAS_STIPEND,
      gtaiAggregator.address,
      triggerDutchXAuctionCleared.address,
      actionWithdrawFromDutchXToBeneficiary.address,
      { from: ganacheCoreDeployer }
    );
  } else {
    console.log(`\n\tDeploying ${CONTRACT_NAME} to live net\n`);
    // Constructor params
    gelatoCore = await GelatoCore.deployed();
    dutchX = await DutchExchangeProxy.deployed();
    gtaiAggregator = await GTAIAggregator.deployed();
    triggerDutchXAuctionCleared = await TriggerDutchXAuctionCleared.deployed();
    actionWithdrawFromDutchXToBeneficiary = await ActionWithdrawFromDutchXToBeneficiary.deployed();
    console.log(`
          Deploying ${CONTRACT_NAME} with
          =============================
          GelatoCore:        ${gelatoCore.address}
          DutchX Proxy:      ${dutchX.address}
          Action Gas Stipend: ${ACTION_GAS_STIPEND}
          GTAI Aggregator:   ${gtaiAggregator.address}
          TriggerDutchXAuctionCleared: ${triggerDutchXAuctionCleared.address}
          ActionWithdrawFromDutchXToBeneficiary: ${actionWithdrawFromDutchXToBeneficiary.address}
    `);
    await deployer.deploy(
      ActionChainedDutchXSellMintWithdraw,
      gelatoCore.address,
      dutchX.address,
      ACTION_GAS_STIPEND,
      gtaiAggregator.address,
      triggerDutchXAuctionCleared.address,
      actionWithdrawFromDutchXToBeneficiary.address,
    );
  }
  // Print deployed contract address to console
  const deployedContract = await ActionChainedDutchXSellMintWithdraw.deployed();
  console.log(`
        Deployed ${CONTRACT_NAME} instance at:
        ================================
        ${deployedContract.address}`);
};
