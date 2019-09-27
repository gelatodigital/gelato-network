/* global artifacts */
/* eslint no-undef: "error" */

const CONTRACT_NAME = "GelatoCore";

// Set Gelato Contract as truffle artifact
const GelatoCore = artifacts.require("GelatoCore");

// GelatoCore constructor params
const MIN_GTAI_BALANCE = web3.utils.toWei("0.5", "ether");
const EXECUTOR_PROFIT = web3.utils.toWei("2", "finney");
const EXECUTOR_GAS_PRICE = web3.utils.toWei("5", "gwei");
const DEFAULT_GAS_PRICE_FOR_GTAIS = web3.utils.toWei("5", "gwei");
const GAS_INSIDE_GASLEFT_CHECKS = "100000";
const GAS_OUTSIDE_GASLEFT_CHECKS = "41414";
const CAN_EXEC_MAX_GAS = "100000";
const EXECUTOR_GAS_REFUND_ESTIMATE = "50000";


module.exports = async function(deployer, network, accounts) {
  if (network.startsWith("dev")) {
    console.log(`\n\tDeploying ${CONTRACT_NAME}  to ganache\n`)
    const ganacheCoreDeployer = accounts[0]; // Ganache account
    // Log constructor params to console
    console.log(`
          Deploying ${CONTRACT_NAME} with
          =============================
          Owner:                      ${ganacheCoreDeployer}
          minGTAIBalance:             ${web3.utils.fromWei(MIN_GTAI_BALANCE, "ether")} ETH
          executorProfit:             ${web3.utils.fromWei(EXECUTOR_PROFIT, "ether")} ETH
          executorGasPrice:           ${web3.utils.fromWei(EXECUTOR_GAS_PRICE, "gwei")} gwei
          gasInsideGasleftChecks:     ${GAS_INSIDE_GASLEFT_CHECKS} gas
          gasOutsideGasLeftChecks     ${GAS_OUTSIDE_GASLEFT_CHECKS} gas
          executorGasRefundEstimate:  ${EXECUTOR_GAS_REFUND_ESTIMATE} gas
          defaultGasPriceForGTAIs:    ${web3.utils.fromWei(DEFAULT_GAS_PRICE_FOR_GTAIS, "gwei")} gwei
    `);
    // Deploy with constructor params
    await deployer.deploy(
      GelatoCore,
      MIN_GTAI_BALANCE,
      EXECUTOR_PROFIT,
      EXECUTOR_GAS_PRICE,
      CAN_EXEC_MAX_GAS,
      GAS_OUTSIDE_GASLEFT_CHECKS,
      GAS_INSIDE_GASLEFT_CHECKS,
      EXECUTOR_GAS_REFUND_ESTIMATE,
      DEFAULT_GAS_PRICE_FOR_GTAIS,
      { from: ganacheCoreDeployer }
    );
  } else {
    console.log(`\n\tDeploying ${CONTRACT_NAME}  to live net\n`)
    // Deploy GelatoCore with gelatoGasPrice
    console.log(`
          Deploying ${CONTRACT_NAME} with
          =============================
          Owner:                      ${ganacheCoreDeployer}
          minGTAIBalance:             ${web3.utils.fromWei(MIN_GTAI_BALANCE, "ether")} ETH
          executorProfit:             ${web3.utils.fromWei(EXECUTOR_PROFIT, "ether")} ETH
          executorGasPrice:           ${web3.utils.fromWei(EXECUTOR_GAS_PRICE, "gwei")} gwei
          gasInsideGasleftChecks:     ${GAS_INSIDE_GASLEFT_CHECKS} gas
          gasOutsideGasLeftChecks     ${GAS_OUTSIDE_GASLEFT_CHECKS} gas
          executorGasRefundEstimate:  ${EXECUTOR_GAS_REFUND_ESTIMATE} gas
          defaultGasPriceForGTAIs:    ${web3.utils.fromWei(DEFAULT_GAS_PRICE_FOR_GTAIS, "gwei")} gwei
    `);
    await deployer.deploy(
      GelatoCore,
      MIN_GTAI_BALANCE,
      EXECUTOR_PROFIT,
      EXECUTOR_GAS_PRICE,
      CAN_EXEC_MAX_GAS,
      GAS_OUTSIDE_GASLEFT_CHECKS,
      GAS_INSIDE_GASLEFT_CHECKS,
      EXECUTOR_GAS_REFUND_ESTIMATE,
      DEFAULT_GAS_PRICE_FOR_GTAIS
    );
  }
  // Print deployed contract address to console
  const gelatoCore = await GelatoCore.deployed();
  console.log(`
        Deployed GelatoCore instance at:
        ================================
        ${gelatoCore.address}`);
};
