// Config
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

// Javascript Ethereum API Library
const etherslib = require("ethers");

// Plugins
usePlugin("@nomiclabs/buidler-ethers");

// Tasks
// task action function receives the Buidler Runtime Environment as second argument
task(
  "blockNumber",
  "Logs the current block number of connected network",
  async (_, { ethers }) => {
    try {
      const network = await ethers.provider.getNetwork();
      await ethers.provider.getBlockNumber().then(blockNumber => {
        console.log(
          `Current block number on ${network.name.toUpperCase()}: ${blockNumber}`
        );
      });
    } catch (err) {
      console.error(err);
    }
  }
);

task(
  "etherPrice",
  "Logs the etherscan ether-USD price",
  async (_, { ethers }) => {
    try {
      const { name } = await ethers.provider.getNetwork();
      const etherscanProvider = new etherslib.providers.EtherscanProvider();
      const ethUSDPrice = await etherscanProvider.getEtherPrice();
      console.log(`\n\t\t Ether price in USD (${name}): ${ethUSDPrice}`);
    } catch (err) {
      console.error(err);
    }
  }
);

task("network", "Logs the connected network", async (_, { ethers }) => {
  try {
    await ethers.provider.getNetwork().then(network => {
      console.log(`Currently connected to: ${network.name.toUpperCase()}`);
    });
  } catch (err) {
    console.error(err);
  }
});
