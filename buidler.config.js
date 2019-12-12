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
console.log(
  `\n\t\t ENV configured: ${DEV_MNEMONIC !== undefined &&
    INFURA_ID !== undefined}`
);

module.exports = {
  defaultNetwork: "buidlerevm",
  networks: {
    buidlerevm: {
      gas: 9500000,
      hardfork: "istanbul"
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${INFURA_ID}`,
      chainId: 3,
      accounts: { mnemonic: DEV_MNEMONIC },
      contracts: [
        "ActionKyberTrade",
        "ActionMultiMintForTimeTrigger",
        "GelatoCore",
        "TriggerTimestampPassed"
      ],
      deployments: {
        actionKyberTrade: "0xBcFE16FA07D10eB594e18C567677f5FD5c2f9810",
        actionMultiMintForTimeTrigger:
          "0xDceFcE56B11Df6248889c702c71bA1BC4Cb14D25",
        gelatoCore: "0x86CcCd81e00E5164b76Ef632EF79a987A4ACE938",
        triggerTimestampPassed: "0x4CE65C29303929455c9373F0B657C5d00E2EC714"
      }
    }
  },
  solc: {
    version: "0.5.14",
    optimizer: { enabled: true, runs: 200 }
  }
};

// ============ Plugins ============================================================
usePlugin("@nomiclabs/buidler-ethers");
usePlugin("@nomiclabs/buidler-solhint");

// ============ Tasks ==============================================================
// task action function receives the Buidler Runtime Environment as second argument
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
      return blockNumber;
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
      const blockNumber = await provider.getBlockNumber();
      console.log(
        `Current block number on ${networkName.toUpperCase()}: ${blockNumber}`
      );
      return blockNumber;
    } catch (err) {
      console.error(err);
    }
  }
);

task("config", "Logs the current BRE config", async (_, { config }) => {
  try {
    console.log(config);
    return config;
  } catch (err) {
    console.error(err);
  }
});

task(
  "contracts-ropsten",
  "Logs the names of contracts available for deployment on ropsten",
  async (_, { config }) => {
    try {
      if (checkNestedObj(config, "networks", "ropsten", "contracts")) {
        console.log("\n", config.networks.ropsten.contracts, "\n");
        return config.networks.ropsten.contracts;
      } else
        throw new Error("No contracts for Ropsten exist inside BRE config");
    } catch (err) {
      console.error(err);
    }
  }
);

task(
  "deployments-ropsten",
  "Logs the addresses of deployed contracts on ropsten",
  async (_, { config }) => {
    try {
      if (checkNestedObj(config, "networks", "ropsten", "deployments")) {
        console.log("\n", config.networks.ropsten.deployments, "\n");
        return config.networks.ropsten.deployments;
      } else
        throw new Error("No deployments for Ropsten exist inside BRE config");
    } catch (err) {
      console.error(err);
    }
  }
);

task("env", "Logs the current Buidler Runtime Environment", async (_, env) => {
  try {
    console.log(env);
    return env;
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
      const allowance = await erc20Allowance(taskArgs, ethers);
      console.log(`\n\t\t erc20-allowance: ${allowance}`);
      return allowance;
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
      return balance;
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
    return ethUSDPrice;
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
      if (networkName.toUpperCase() == "UNKNOWN")
        console.log("\t\t UNKNOWN may be buidlerevm");
      return networkName;
    } catch (err) {
      console.error(err);
    }
  }
);
