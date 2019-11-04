require("dotenv").config();

const HDWalletProvider = require("@truffle/hdwallet-provider");
const DEV_MNEMONIC = process.env.DEV_MNEMONIC;
const INFURA_ID = process.env.INFURA_ID;

module.exports = {
  networks: {
    development: {
      protocol: "http",
      host: "localhost",
      port: 8545,
      gas: 5000000,
      gasPrice: 5e9,
      networkId: "*"
    },
    ropsten: {
      provider: () =>
        new HDWalletProvider(DEV_MNEMONIC, "https://ropsten.infura.io/v3/" + INFURA_ID),
      networkId: 3 // Ropsten's id
    }/*,
    rinkeby: {
      provider: () =>
        new HDWalletProvider(DEV_MNEMONIC, "https://rinkeby.infura.io/v3/" + INFURA_ID),
      networkId: 3 // Ropsten's id
    }*/
  }
};
