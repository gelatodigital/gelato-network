/* global artifacts */
/* eslint no-undef: "error" */

// Set Gelato Contract as truffle artifact
const GelatoCore = artifacts.require("GelatoCore");

// GelatoCore constructor params
const MIN_INTERFACE_BALANCE = web3.utils.toWei("0.5", "ether");
const EXECUTOR_PROFIT = web3.utils.toWei("2", "finney");
const EXECUTOR_GAS_PRICE = web3.utils.toWei("5", "gwei");
const CAN_EXEC_FN_MAX_GAS = 100000;
const FIXEDGASCONSUMPTIONINBETWEEN = 100000;
const UNCOUNTEDGASCONSUMPTION = 41414;
const EXECUTOR_REFUNDED_GAS = 50000;
const RECOMMENDED_GAS_PRICE_FOR_INTERFACES = web3.utils.toWei("5", "gwei");

module.exports = async function(deployer, network, accounts) {
  if (network.startsWith("dev")) {
    console.log("\n\tDeploying Gelato Core to ganache\n")
    const ganacheCoreDeployer = accounts[0]; // Ganache account
    // Log constructor params to console
    console.log(`
          Deploying GelatoCore.sol with
          =============================
          Owner:                      ${ganacheCoreDeployer}
          minInterfaceBalance:        ${web3.utils.fromWei(MIN_INTERFACE_BALANCE, "ether")} ETH
          executorProfit:             ${web3.utils.fromWei(EXECUTOR_PROFIT, "ether")} ETH
          executorGasPrice:           ${web3.utils.fromWei(EXECUTOR_GAS_PRICE, "gwei")} gwei
          execFixedGasConsInBetween:  ${FIXEDGASCONSUMPTIONINBETWEEN} gas
          executorRefundedGas:        ${EXECUTOR_REFUNDED_GAS} gas
          recommendedGasPrice:        ${web3.utils.fromWei(RECOMMENDED_GAS_PRICE_FOR_INTERFACES, "gwei")} gwei
          `);
    // Deploy with constructor params
    await deployer.deploy(
      GelatoCore,
      MIN_INTERFACE_BALANCE,
      EXECUTOR_PROFIT,
      EXECUTOR_GAS_PRICE,
      CAN_EXEC_FN_MAX_GAS,
      UNCOUNTEDGASCONSUMPTION,
      FIXEDGASCONSUMPTIONINBETWEEN,
      EXECUTOR_REFUNDED_GAS,
      RECOMMENDED_GAS_PRICE_FOR_INTERFACES,
      { from: ganacheCoreDeployer }
    );
  } else {
    console.log("\n\tDeploying Gelato Core to live net\n")
    // Deploy GelatoCore with gelatoGasPrice
    console.log(`
          Deploying GelatoCore.sol with
          =============================
          Owner:                      ${accounts[0]}
          minInterfaceBalance:        ${web3.utils.fromWei(MIN_INTERFACE_BALANCE, "ether")} ETH
          executorProfit:             ${web3.utils.fromWei(EXECUTOR_PROFIT, "ether")} ETH
          executorGasPrice:           ${web3.utils.fromWei(EXECUTOR_GAS_PRICE, "gwei")} gwei
          execFixedGasConsInBetween:  ${FIXEDGASCONSUMPTIONINBETWEEN} gas
          executorRefundedGas:        ${EXECUTOR_REFUNDED_GAS} gas
          recommendedGasPrice:        ${web3.utils.fromWei(RECOMMENDED_GAS_PRICE_FOR_INTERFACES, "gwei")} gwei
          `);
    await deployer.deploy(
      GelatoCore,
      MIN_INTERFACE_BALANCE,
      EXECUTOR_PROFIT,
      EXECUTOR_GAS_PRICE,
      CAN_EXEC_FN_MAX_GAS,
      UNCOUNTEDGASCONSUMPTION,
      FIXEDGASCONSUMPTIONINBETWEEN,
      EXECUTOR_REFUNDED_GAS,
      RECOMMENDED_GAS_PRICE_FOR_INTERFACES
    );
  }
  // Print deployed contract address to console
  const gelatoCore = await GelatoCore.deployed();
  console.log(`
        Deployed GelatoCore instance at:
        ================================
        ${gelatoCore.address}`);
};
