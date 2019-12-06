// Helpers
require("@babel/register");
const { getDefaultProvider, providers, utils } = require("ethers");
const {
  checkNestedObj,
  getNestedObj
} = require("./scripts/helpers/nestedObjects");
const { sleep } = require("./scripts/helpers/sleep");

// ============ Buidler Runtime Environment (BRE) ==================================
// extendEnvironment(env => { env.x = x; })

// ============ Config =============================================================
// Env Variables
require("dotenv").config();
const DEV_MNEMONIC = process.env.DEV_MNEMONIC;
const INFURA_ID = process.env.INFURA_ID;

module.exports = {
  defaultNetwork: "buidlerevm",
  networks: {
    ropsten: {
      url: `https://ropsten.infura.io/v3/${INFURA_ID}`,
      chainId: 3,
      accounts: { mnemonic: DEV_MNEMONIC },
      deployments: {
        actionMultiMintForTimeTrigger:
          "0x37D03f8C173ceAa7E58f74C819383b862318A2C0",
        gelatoCore: "0x76dd57554B6B4DB5F44419d3564Ae23164e56E8f"
      }
    }
  },
  solc: {
    version: "0.5.13",
    optimizer: { enabled: false }
  }
};

// ============ Plugins ============================================================
usePlugin("@nomiclabs/buidler-ethers");

// ============ Tasks ==============================================================
// task action function receives the Buidler Runtime Environment as second argument
task(
  "deployments-ropsten",
  "Logs the addresses of deployed contracts on ropsten",
  async (_, { config }) => {
    try {
      if (checkNestedObj(config, "networks", "ropsten", "deployments")) {
        console.log(config.networks.ropsten.deployments);
      } else
        throw new Error("No deployments for Ropsten exist inside BRE config");
    } catch (err) {
      console.error(err);
    }
  }
);

task(
  "block-number",
  "Logs the current block number of connected network",
  async (_, { ethers }) => {
    try {
      const { name: networkName } = await ethers.provider.getNetwork();
      const blockNumber = await ethers.provider.getBlockNumber();
      console.log(
        `Current block number on ${networkName.toUpperCase()}: ${blockNumber}`
      );
    } catch (err) {
      console.error(err);
    }
  }
);

task(
  "block-number-ropsten",
  "Logs the current block number of Ropsten Test Net",
  async () => {
    try {
      const provider = getDefaultProvider("ropsten");
      const { name: networkName } = await provider.getNetwork();
      const blockNumber = await ethers.provider.getBlockNumber();
      console.log(
        `Current block number on ${networkName.toUpperCase()}: ${blockNumber}`
      );
    } catch (err) {
      console.error(err);
    }
  }
);

task("config", "Logs the current BRE config", async (_, { config }) => {
  try {
    console.log(config);
  } catch (err) {
    console.error(err);
  }
});

task("env", "Logs the current Buidler Runtime Environment", async (_, env) => {
  try {
    console.log(env);
  } catch (err) {
    console.error(err);
  }
});

task("erc20-approve", "Approves <spender> for <erc20> <amount>")
  .addParam("erc20", "The erc20 contract address")
  .addParam("spender", "The spender's address")
  .addParam("amount", "The amount of erc20 tokens to approve")
  .setAction(async (taskArgs, { ethers }) => {
    try {
      const { erc20Approve } = require("./scripts/buidler_tasks/erc20Tasks");
      await erc20Approve(taskArgs, ethers);
    } catch (error) {
      console.error(error);
    }
  });

task("erc20-allowance", "Logs <spender>'s <erc20> allowance from <owner>")
  .addParam("erc20", "The erc20 contract address")
  .addParam("owner", "The owners's address")
  .addParam("spender", "The spender's address")
  .setAction(async (taskArgs, { ethers }) => {
    try {
      const { erc20Allowance } = require("./scripts/buidler_tasks/erc20Tasks");
      await erc20Allowance(taskArgs, ethers);
    } catch (error) {
      console.error(error);
    }
  });

task("eth-balance", "Prints an account's ether balance")
  .addParam("a", "The account's address")
  .setAction(async taskArgs => {
    try {
      const address = utils.getAddress(taskArgs.a);
      const provider = getDefaultProvider("ropsten");
      const balance = await provider.getBalance(address);
      console.log(`\n\t\t ${utils.formatEther(balance)} ETH`);
    } catch (error) {
      console.error(error);
    }
  });

task("eth-price", "Logs the etherscan ether-USD price", async () => {
  try {
    const etherscanProvider = new providers.EtherscanProvider();
    const { name: networkName } = await etherscanProvider.getNetwork();
    const ethUSDPrice = await etherscanProvider.getEtherPrice();
    console.log(`\n\t\t Ether price in USD (${networkName}): ${ethUSDPrice}`);
  } catch (err) {
    console.error(err);
  }
});

task(
  "network-current",
  "Logs the currently connected network",
  async (_, { ethers }) => {
    try {
      const { name: networkName } = await ethers.provider.getNetwork();
      console.log(
        `\n\t\t Currently connected to: ${networkName.toUpperCase()}`
      );
    } catch (err) {
      console.error(err);
    }
  }
);
