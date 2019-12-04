// Local imports
const { getDefaultProvider, providers } = require("ethers");

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
      accounts: { mnemonic: DEV_MNEMONIC }
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
  "blockNumber",
  "Logs the current block number of connected network",
  async (_, { ethers }) => {
    try {
      const { name: networkName } = await ethers.provider.getNetwork();
      await ethers.provider.getBlockNumber().then(blockNumber => {
        console.log(
          `Current block number on ${networkName.toUpperCase()}: ${blockNumber}`
        );
      });
    } catch (err) {
      console.error(err);
    }
  }
);

task(
  "blockNumber:ropsten",
  "Logs the current block number of Ropsten Test Net",
  async (_, {}) => {
    try {
      const provider = getDefaultProvider("ropsten");
      const { name: networkName } = await provider.getNetwork();
      await provider.getBlockNumber().then(blockNumber => {
        console.log(
          `\n\t\t Current block number on ${networkName.toUpperCase()}: ${blockNumber}`
        );
      });
    } catch (err) {
      console.error(err);
    }
  }
);

task("ether:balance");

task(
  "ether:price",
  "Logs the etherscan ether-USD price",
  async (_, { ethers }) => {
    try {
      const { name: networkName } = await ethers.provider.getNetwork();
      const etherscanProvider = new providers.EtherscanProvider();
      const ethUSDPrice = await etherscanProvider.getEtherPrice();
      console.log(`\n\t\t Ether price in USD (${networkName}): ${ethUSDPrice}`);
    } catch (err) {
      console.error(err);
    }
  }
);

task(
  "network:current",
  "Logs the currently connected network",
  async (_, { ethers }) => {
    try {
      await ethers.provider.getNetwork().then(network => {
        console.log(
          `\n\t\t Currently connected to: ${network.name.toUpperCase()}`
        );
      });
    } catch (err) {
      console.error(err);
    }
  }
);
