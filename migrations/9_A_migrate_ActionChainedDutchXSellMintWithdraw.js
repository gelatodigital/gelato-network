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
const ACTION_SIGNATURE =
  "sellMintWithdraw(uint256,address,address,address,uint256)";
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
          GelatoCore:       ${gelatoCore.address}
          DutchX Proxy:     ${dutchX.address}
          ActionGasStipend: ${ACTION_GAS_STIPEND}
          ActionSignature:  ${ACTION_SIGNATURE}
          GTAIAggregator:   ${gtaiAggregator.address}
          TriggerDutchXAuctionCleared:           ${triggerDutchXAuctionCleared.address}
          ActionWithdrawFromDutchXToBeneficiary: ${actionWithdrawFromDutchXToBeneficiary.address}
    `);
    // Deploy with constructor params
    await deployer.deploy(
      ActionChainedDutchXSellMintWithdraw,
      gelatoCore.address,
      dutchX.address,
      ACTION_SIGNATURE,
      ACTION_GAS_STIPEND,
      gtaiAggregator.address,
      triggerDutchXAuctionCleared.address,
      actionWithdrawFromDutchXToBeneficiary.address,
      { from: accounts[0] }
    );
  } else if (network.startsWith("rinkeby")) {
    console.log(`\n\tDeploying ${CONTRACT_NAME} to RINKEBY\n`);
    // Constructor params
    gelatoCore = await GelatoCore.deployed();
    dutchX = await DutchExchangeProxy.at(
      "0xaAEb2035FF394fdB2C879190f95e7676f1A9444B"
    );
    gtaiAggregator = await GTAIAggregator.deployed();
    triggerDutchXAuctionCleared = await TriggerDutchXAuctionCleared.deployed();
    actionWithdrawFromDutchXToBeneficiary = await ActionWithdrawFromDutchXToBeneficiary.deployed();
    console.log(`
          Deploying ${CONTRACT_NAME} with
          =============================
          GelatoCore:       ${gelatoCore.address}
          DutchX Proxy:     ${dutchX.address}
          ActionGasStipend: ${ACTION_GAS_STIPEND}
          ActionSignature:  ${ACTION_SIGNATURE}
          GTAIAggregator:   ${gtaiAggregator.address}
          TriggerDutchXAuctionCleared:           ${triggerDutchXAuctionCleared.address}
          ActionWithdrawFromDutchXToBeneficiary: ${actionWithdrawFromDutchXToBeneficiary.address}
    `);
    await deployer.deploy(
      ActionChainedDutchXSellMintWithdraw,
      gelatoCore.address,
      dutchX.address,
      ACTION_SIGNATURE,
      ACTION_GAS_STIPEND,
      gtaiAggregator.address,
      triggerDutchXAuctionCleared.address,
      actionWithdrawFromDutchXToBeneficiary.address
    );
  } else {
    console.log("Do later");
  }
  // Print deployed contract address to console
  const deployedContract = await ActionChainedDutchXSellMintWithdraw.deployed();
  console.log(`
        Deployed ${CONTRACT_NAME} instance at:
        ================================
        ${deployedContract.address}`);
};
