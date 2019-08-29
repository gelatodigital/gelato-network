/* global artifacts */
/* eslint no-undef: "error" */

// Set Gelato Contract as truffle artifact
const GelatoCore = artifacts.require("GelatoCore");

// GelatoCore constructor params
const MIN_INTERFACE_BALANCE = web3.utils.toWei("0.5", "ether");
const EXECUTOR_PROFIT = web3.utils.toWei("2", "finney");
const EXECUTOR_GAS_PRICE = web3.utils.toWei("5", "gwei");
const EXEC_FN_GAS_OVERHEAD = 34034;
const EXEC_FN_REFUNDED_GAS = 30000;
const RECOMMENDED_GAS_PRICE_FOR_INTERFACES = web3.utils.toWei("5", "gwei");

module.exports = async function(deployer, network, accounts) {
  // const coreDeployer = accounts[0];
  // const _interfaceDeployer = accounts[1];

  // Deploy GelatoCore with gelatoGasPrice
  console.log(`
        Deploying GelatoCore.sol with
        =============================
        Owner: ${coreDeployer}
        executorProfit:    ${EXECUTOR_PROFIT}
        executorGasPrice:  ${EXECUTOR_GAS_PRICE}
        execFNGasOverhead: ${EXEC_FN_GAS_OVERHEAD}
        execFNRefundedGas: ${EXEC_FN_REFUNDED_GAS}
        `)
  await deployer.deploy(
    GelatoCore,
    MIN_INTERFACE_BALANCE,
    EXECUTOR_PROFIT,
    EXECUTOR_GAS_PRICE,
    EXEC_FN_GAS_OVERHEAD,
    EXEC_FN_REFUNDED_GAS,
    RECOMMENDED_GAS_PRICE_FOR_INTERFACES
    // { from: coreDeployer }
  );

  const gelatoCore = await GelatoCore.deployed();
  console.log(`
        Deployed GelatoCore instance at:
        ================================
        ${gelatoCore.address}`);
};
