/* global artifacts */
/* eslint no-undef: "error" */

const CONTRACT_NAME = "GelatoCore";

// Set Gelato Contract as truffle artifact
const GelatoCore = artifacts.require("GelatoCore");

// GelatoCore constructor params
const MIN_STAKE_PER_EXECUTION_CLAIM = web3.utils.toWei("0.01", "ether");
const EXECUTOR_PROFIT = web3.utils.toWei("2", "finney");
const EXECUTOR_GAS_PRICE = web3.utils.toWei("5", "gwei");
const GAS_INSIDE_GASLEFT_CHECKS = "100000";
const GAS_OUTSIDE_GASLEFT_CHECKS = "41414";
const CAN_EXEC_MAX_GAS = "100000";
const EXECUTOR_GAS_REFUND_ESTIMATE = "50000";
const CANCEL_INCENTIVE = web3.utils.toWei("0.5", "finney");

module.exports = async function(deployer, network, accounts) {
  if (network.startsWith("dev")) {
    console.log(`\n\tDeploying ${CONTRACT_NAME}  to ganache\n`);
    // Log constructor params to console
    console.log(`
          Deploying ${CONTRACT_NAME} with
          =============================
          Owner:                      ${accounts[0]}
          minStakePerExecutionClaim:             ${web3.utils.fromWei(
            MIN_STAKE_PER_EXECUTION_CLAIM,
            "ether"
          )} ETH
          executorProfit:             ${web3.utils.fromWei(
            EXECUTOR_PROFIT,
            "ether"
          )} ETH
          executorGasPrice:           ${web3.utils.fromWei(
            EXECUTOR_GAS_PRICE,
            "gwei"
          )} gwei
          gasInsideGasleftChecks:     ${GAS_INSIDE_GASLEFT_CHECKS} gas
          gasOutsideGasLeftChecks     ${GAS_OUTSIDE_GASLEFT_CHECKS} gas
          executorGasRefundEstimate:  ${EXECUTOR_GAS_REFUND_ESTIMATE} gas
          cancelIncentive:            ${web3.utils.fromWei(
            CANCEL_INCENTIVE,
            "ether"
          )} ETH
    `);
    // Deploy with constructor params
    await deployer.deploy(
      GelatoCore,
      MIN_STAKE_PER_EXECUTION_CLAIM,
      EXECUTOR_PROFIT,
      EXECUTOR_GAS_PRICE,
      GAS_OUTSIDE_GASLEFT_CHECKS,
      GAS_INSIDE_GASLEFT_CHECKS,
      CAN_EXEC_MAX_GAS,
      EXECUTOR_GAS_REFUND_ESTIMATE,
      CANCEL_INCENTIVE,
      { from: accounts[0] }
    );
  } else {
    console.log(`\n\tDeploying ${CONTRACT_NAME}  to live net\n`);
    // Deploy GelatoCore with gelatoGasPrice
    console.log(`
          Deploying ${CONTRACT_NAME} with
          =============================
          Owner:                      HOW TO GET CURRENT PROVIDER SELECTED ADDRESS?
          minStakePerExecutionClaim:             ${web3.utils.fromWei(
            MIN_STAKE_PER_EXECUTION_CLAIM,
            "ether"
          )} ETH
          executorProfit:             ${web3.utils.fromWei(
            EXECUTOR_PROFIT,
            "ether"
          )} ETH
          executorGasPrice:           ${web3.utils.fromWei(
            EXECUTOR_GAS_PRICE,
            "gwei"
          )} gwei
          gasInsideGasleftChecks:     ${GAS_INSIDE_GASLEFT_CHECKS} gas
          gasOutsideGasLeftChecks     ${GAS_OUTSIDE_GASLEFT_CHECKS} gas
          executorGasRefundEstimate:  ${EXECUTOR_GAS_REFUND_ESTIMATE} gas
          cancelIncentive:            ${web3.utils.fromWei(
            CANCEL_INCENTIVE,
            "ether"
          )} ETH
    `);
    await deployer.deploy(
      GelatoCore,
      MIN_STAKE_PER_EXECUTION_CLAIM,
      EXECUTOR_PROFIT,
      EXECUTOR_GAS_PRICE,
      GAS_OUTSIDE_GASLEFT_CHECKS,
      GAS_INSIDE_GASLEFT_CHECKS,
      CAN_EXEC_MAX_GAS,
      EXECUTOR_GAS_REFUND_ESTIMATE,
      CANCEL_INCENTIVE
    );
  }
  // Print deployed contract address to console
  const gelatoCore = await GelatoCore.deployed();
  console.log(`
        Deployed GelatoCore instance at:
        ================================
        ${gelatoCore.address}`);
};
