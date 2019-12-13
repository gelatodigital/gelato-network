// Helpers
require("@babel/register");
const { getDefaultProvider, providers, utils } = require("ethers");
const {
  checkNestedObj,
  getNestedObj
} = require("./scripts/helpers/nestedObjects");
const { sleep } = require("./scripts/helpers/sleep");

// ============ Buidler Runtime Environment (BRE) ==================================
// extendEnvironment(bre => { bre.x = x; })

// ============ Config =============================================================
// Env Variables
require("dotenv").config();
const DEV_MNEMONIC = process.env.DEV_MNEMONIC;
const INFURA_ID = process.env.INFURA_ID;
console.log(
  `\n\t\t ENV configured: ${DEV_MNEMONIC !== undefined &&
    INFURA_ID !== undefined}\n`
);
// Defaults
const DEFAULT_NETWORK = "ropsten";

module.exports = {
  defaultNetwork: DEFAULT_NETWORK,
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

// ============ Tasks ==============================================================
// task action function receives the Buidler Runtime Environment as second argument
task(
  "block-number",
  `Logs the current block number on [--network] (default: ${DEFAULT_NETWORK})`,
  async (_, { ethers }) => {
    try {
      const blockNumber = await ethers.provider.getBlockNumber();
      console.log(
        `Current block number on ${ethers._buidlerProvider._networkName.toUpperCase()}: ${blockNumber}`
      );
      return blockNumber;
    } catch (err) {
      console.error(err);
    }
  }
);

task("bre", "Logs the current Buidler Runtime Environment", async (_, bre) => {
  try {
    console.dir(bre);
    return bre;
  } catch (err) {
    console.error(err);
  }
});

task("bre-config", "Logs the current BRE config")
  .addFlag("n", "config of networks")
  .addFlag("dn", "config of default network")
  .addFlag("paths", "config of paths")
  .addFlag("solc", "config of solidity compiler")
  .setAction(async ({ n, dn, paths, solc }, { config }) => {
    try {
      const returnValues = [];
      if (n) {
        console.log("\n BRE Config Networks:\n", config.networks);
        returnValues.push(config.networks);
      }
      if (dn) {
        console.log(
          `\n\t\t BRE Config default network: ${config.defaultNetwork}`
        );
        returnValues.push(config.defaultNetwork);
      }
      if (paths) {
        console.log("\n BRE Config paths:\n", config.paths);
        returnValues.push(config.paths);
      }
      if (solc) {
        console.log("\n BRE Config solc:\n", config.solc);
        returnValues.push(config.solc);
      }
      if (returnValues.length == 0) {
        console.log(network);
        return network;
      } else if (returnValues.length == 1) {
        return returnValues[0];
      }
      return returnValues;
    } catch (err) {
      console.error(err);
    }
  });

task("bre-network", `Logs the BRE network object (default: ${DEFAULT_NETWORK})`)
  .addFlag("c", "Logs the BRE network config")
  .addFlag("name", "Logs the currently connected BRE network name")
  .addFlag("provider", "Logs the currently connected BRE network provider")
  .setAction(async ({ c, name, provider }, { network }) => {
    try {
      const returnValues = [];
      if (c) {
        console.log("\n BRE Network Config:\n", network.config);
        returnValues.push(network.config);
      }
      if (name) {
        console.log(`\n \t\t BRE Neworkname: ${network.name}`);
        returnValues.push(network.name);
      }
      if (provider) {
        console.log("\n BRE Network Provider:\n", network.provider);
        returnValues.push(network.provider);
      }
      if (returnValues.length == 0) {
        console.log(network);
        return network;
      } else if (returnValues.length == 1) {
        return returnValues[0];
      }
      return returnValues;
    } catch (err) {
      console.error(err);
    }
  });

task(
  "bre-network-contracts",
  `Logs the names of contracts available for deployment on [--network] (default: ${DEFAULT_NETWORK}})`,
  async (_, { config, network }) => {
    try {
      if (checkNestedObj(config, "networks", network.name, "contracts")) {
        console.log("\n", config.networks[network.name].contracts, "\n");
        return config.networks[network.name].contracts;
      } else
        throw new Error(
          `No contracts for ${network.name} exist inside BRE config`
        );
    } catch (err) {
      console.error(err);
    }
  }
);

task(
  "bre-network-deployments",
  `Logs the addresses of deployed contracts on [--network] (default: ${DEFAULT_NETWORK})`,
  async (_, { config, network }) => {
    try {
      if (checkNestedObj(config, "networks", network.name, "deployments")) {
        console.log("\n", config.networks[network.name].deployments, "\n");
        return config.networks[network.name].deployments;
      } else
        throw new Error("No deployments for Ropsten exist inside BRE config");
    } catch (err) {
      console.error(err);
    }
  }
);

task(
  "deploy",
  `Deploys <contractname> to [--network] (default: ${DEFAULT_NETWORK})`
)
  .addParam("contractname", "the name of the contract artifact to deploy")
  .setAction(async (taskArgs, bre) => {
    try {
      const deployWithoutConstructorArgs = require("./scripts/buidler_tasks/deploy/deployWithoutConstructorArgs");
      await deployWithoutConstructorArgs(taskArgs.contractName, bre);
    } catch (err) {
      console.error(err);
    }
  });

task(
  "erc20-approve",
  `Approves <spender> for <erc20> <amount> on [--network] (default: ${DEFAULT_NETWORK})`
)
  .addParam("erc20", "The erc20 contract address")
  .addParam("spender", "The spender's address")
  .addParam("amount", "The amount of erc20 tokens to approve")
  .setAction(async (taskArgs, { ethers }) => {
    try {
      const erc20Approve = require("./scripts/buidler_tasks/erc20/erc20Approve");
      await erc20Approve(taskArgs, ethers);
    } catch (error) {
      console.error(error);
    }
  });

task(
  "erc20-allowance",
  `Logs <spender>'s <erc20> allowance from <owner> on [--network] (default: ${DEFAULT_NETWORK})`
)
  .addParam("erc20", "The erc20 contract address")
  .addParam("owner", "The owners's address")
  .addParam("spender", "The spender's address")
  .setAction(async (taskArgs, { ethers }) => {
    try {
      const erc20Allowance = require("./scripts/buidler_tasks/erc20/erc20Allowance");
      const allowance = await erc20Allowance(taskArgs, ethers);
      console.log(`\n\t\t erc20-allowance: ${allowance}`);
      return allowance;
    } catch (error) {
      console.error(error);
    }
  });

task(
  "eth-balance",
  `Logs an account's [--a] ETH balance on [--network] (default: ${DEFAULT_NETWORK})`
)
  .addParam("a", "The account's address")
  .setAction(async (taskArgs, { ethers }) => {
    try {
      const networkName = run(network);
      const balance = await ethers.provider.getBalance(taskArgs.a);
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
    console.log(`\n\t\t Ether price in USD (${networkName}): ${ethUSDPrice}$`);
    return ethUSDPrice;
  } catch (err) {
    console.error(err);
  }
});

task(
  "ethers",
  `Logs the BRE config for the ethers plugin on [--network] (default: ${DEFAULT_NETWORK})`,
  async (_, { ethers }) => {
    try {
      console.log(ethers);
      return ethers;
    } catch (err) {
      console.error(err);
    }
  }
);

task(
  "ethers-signer",
  `Logs the default Signer Object configured by buidler-ethers for [--network] (default: ${DEFAULT_NETWORK})`
).setAction(async (_, { ethers }) => {
  try {
    const [signer] = await ethers.signers();
    console.log(signer);
    return signer;
  } catch (error) {
    console.error(error);
  }
});

task(
  "ethers-signer-address",
  `Logs the address of the default Signer Object configured by buidler-ethers for [--network] (default: ${DEFAULT_NETWORK})`
).setAction(async (_, { ethers }) => {
  try {
    const [signer] = await ethers.signers();
    console.log(`\n\t\t${signer._address}`);
    return signer._address;
  } catch (error) {
    console.error(error);
  }
});

task(
  "ethers-signer-eth-balance",
  `Logs the currently configured Signer's ETH balance [at --block] on [--network] (default: ${DEFAULT_NETWORK})`
)
  .addOptionalParam("block", "Optional Param: block or blockTag to query")
  .setAction(async (taskArgs, { ethers }) => {
    try {
      const [signer] = await ethers.signers();
      let balance;
      const block = getNestedObj(taskArgs, "block");
      if (block) {
        if (isNaN(block)) balance = await signer.getBalance(taskArgs.block);
        else balance = await signer.getBalance(parseInt(taskArgs.block));
      } else {
        balance = await signer.getBalance();
      }
      console.log(
        "\n\t\t Signer Address:",
        signer._address,
        `\n\t\t Balance:        ${utils.formatEther(balance)} ETH\n`
      );
      return [signer, balance];
    } catch (error) {
      console.error(error);
    }
  });

task(
  "ethers-signers",
  "Logs the currently configured transaction buidler-ethers Signer objects"
).setAction(async (_, { ethers }) => {
  try {
    const signers = await ethers.signers();
    console.log(signers);
    return signers;
  } catch (error) {
    console.error(error);
  }
});

task(
  "ethers-signers-address",
  "Prints the currently configured transaction buidler-ethers Signer objects"
).setAction(async (_, { ethers }) => {
  try {
    const signers = await ethers.signers();
    let signerAddresses = [];
    for (signer of signers) {
      console.log(`\t\t${signer._address}`);
      signerAddresses.push(signer._address);
    }
    return signerAddresses;
  } catch (error) {
    console.error(error);
  }
});
