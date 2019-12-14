// Helpers
require("@babel/register");
const assert = require("assert");
const { providers, utils } = require("ethers");
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
        "ActionMultiMintForTriggerTimestampPassed",
        "GelatoCore",
        "TriggerTimestampPassed"
      ],
      deployments: {
        ActionKyberTrade: "0x7dAFBd01803e298F9e19734Fa7Af3dA10585554e",
        ActionMultiMintForTimeTrigger:
          "0xb1FA1BCdb245326d8f6413925Cf338FCEbda5db9",
        GelatoCore: "0x43c7a05290797a25B2E3D4fDE7c504333EbE2428",
        TriggerTimestampPassed: "0x45664969e60Bdde9Fb658B85a9808b572B2dD5E6"
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
        `${ethers.provider._buidlerProvider._networkName}: ${blockNumber}`
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
  .addFlag(
    "contracts",
    "Use with --networks for a list of contracts available for deployment on --networkname"
  )
  .addFlag("defaultnetwork", "config of default network")
  .addFlag(
    "deployments",
    "Use with --networks for an address book of deployed contract instances on --networkname"
  )
  .addFlag("networks", "config of networks")
  .addOptionalParam(
    "networkname",
    "Optional use with --networks to get info for a specific network"
  )
  .addFlag("paths", "config of paths")
  .addFlag("solc", "config of solidity compiler")
  .setAction(
    async (
      {
        contracts,
        defaultnetwork,
        deployments,
        networks,
        networkname,
        paths,
        solc
      },
      { config }
    ) => {
      try {
        const optionalReturnValues = [];

        if (defaultnetwork) optionalReturnValues.push(config.defaultNetwork);
        if (networks) {
          const networkInfo = await run("bre-config:networks", {
            contracts,
            deployments,
            networkname
          });
          optionalReturnValues.push(networkInfo);
        }
        if (paths) optionalReturnValues.push(config.paths);
        if (solc) optionalReturnValues.push(config.solc);

        if (optionalReturnValues.length == 0) {
          console.log(config);
          return config;
        } else if (optionalReturnValues.length == 1) {
          console.log(optionalReturnValues[0]);
          return optionalReturnValues[0];
        }
        console.log(optionalReturnValues);
        return optionalReturnValues;
      } catch (err) {
        console.error(err);
      }
    }
  );

internalTask("bre-config:networks", `Returns bre.config.network info`)
  .addFlag(
    "contracts",
    "Return a list of contract names available for deployment"
  )
  .addFlag("deployments", "Return a list of deployed contract instances")
  .addOptionalParam(
    "networkname",
    `Use with --networks to get info for a specific network (default: ${DEFAULT_NETWORK})`
  )
  .setAction(async ({ contracts, deployments, networkname }, { config }) => {
    try {
      const optionalReturnValues = [];
      if (networkname) await run("checkNetworkName", networkname);
      if (contracts) {
        const contractsInfo = await run("bre-config:networks:contracts", {
          networkname
        });
        optionalReturnValues.push(contractsInfo);
      }
      if (deployments) {
        const deploymentsInfo = await run("bre-config:networks:deployments", {
          networkname
        });
        optionalReturnValues.push(deploymentsInfo);
      }
      if (optionalReturnValues.length == 0)
        return networkname ? config.networks[networkname] : config.networks;
      if (optionalReturnValues.length == 1) return optionalReturnValues[0];
      else return optionalReturnValues;
    } catch (err) {
      console.error(err);
    }
  });

internalTask(
  "bre-config:networks:contracts",
  `Returns bre.config.networks.networkName.contracts`
)
  .addParam("networkname", "Name of network for which to read contracts field")
  .setAction(async ({ networkname }, { config }) => {
    try {
      if (networkname) await run("checkNetworkName", networkname);
      else networkname = DEFAULT_NETWORK;
      if (checkNestedObj(config, "networks", networkname, "contracts"))
        return config.networks[networkname].contracts;
    } catch (err) {
      console.error(err);
    }
  });

internalTask(
  "bre-config:networks:deployments",
  `Returns bre.config.networks.networkName.deployments`
)
  .addParam("networkname", "Name of network for which to read contracts field")
  .setAction(async ({ networkname }, { config }) => {
    try {
      if (networkname) await run("checkNetworkName", networkname);
      else networkname = DEFAULT_NETWORK;
      if (checkNestedObj(config, "networks", networkname, "deployments"))
        return config.networks[networkname].deployments;
    } catch (err) {
      console.error(err);
    }
  });

task("bre-network", `Logs the BRE network object (default: ${DEFAULT_NETWORK})`)
  .addFlag("c", "Logs the BRE network config")
  .addFlag("name", "Logs the currently connected BRE network name")
  .addFlag("provider", "Logs the currently connected BRE network provider")
  .setAction(async ({ c: config, name, provider }, { network }) => {
    try {
      const optionalReturnValues = [];
      if (config) optionalReturnValues.push(network.config);
      if (name) optionalReturnValues.push(network.name);
      if (provider) optionalReturnValues.push(network.provider);

      if (optionalReturnValues.length == 0) {
        console.log(network);
        return network;
      } else if (optionalReturnValues.length == 1) {
        console.log(optionalReturnValues[0]);
        return optionalReturnValues[0];
      }
      console.log(optionalReturnValues);
      return optionalReturnValues;
    } catch (err) {
      console.error(err);
    }
  });

task(
  "deploy",
  `Deploys <contractName> to [--network] (default: ${DEFAULT_NETWORK})`
)
  .addPositionalParam(
    "contractName",
    "the name of the contract artifact to deploy"
  )
  .setAction(async ({ contractName }, { network, run }) => {
    try {
      await require("./scripts/buidler_tasks/deploy/deployWithoutConstructorArgs").default(
        contractName,
        network.name,
        run
      );
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
  .setAction(async ({ a: address }, { ethers }) => {
    try {
      await run("bre-network", { name: "name" });
      const balance = await ethers.provider.getBalance(address);
      console.log(`${utils.formatEther(balance)} ETH`);
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
  `Logs the BRE config for the ethers plugin on [--network] (default: ${DEFAULT_NETWORK})`
)
  .addFlag("a", "Use with --signer or --signers to log addresses")
  .addOptionalParam(
    "block",
    "Use with --signer --ethBalance to log balance at block height"
  )
  .addFlag("buidlerprovider", "Show the buidler-ethers provider")
  .addFlag("ethbalance", "Use with --signer to log Signer's ethBalance")
  .addFlag("provider", "Show the buidler-ethers provider object")
  .addFlag(
    "signer",
    "Logs the default Signer Object configured by buidler-ethers"
  )
  .addFlag(
    "signers",
    "Logs the currently configured transaction buidler-ethers Signer objects"
  )
  .setAction(
    async (
      {
        a: address,
        block,
        buidlerprovider,
        ethbalance,
        provider,
        signer,
        signers
      },
      { ethers }
    ) => {
      try {
        const optionalReturnValues = [];
        if (buidlerprovider)
          optionalReturnValues.push(ethers.provider._buidlerProvider);
        if (provider) optionalReturnValues.push(ethers.provider);
        if (signer) {
          const signerInfo = await run("ethers:signer", {
            address,
            ethbalance,
            block
          });
          optionalReturnValues.push(signerInfo);
        } else if (signers) {
          const signersInfo = await run("ethers:signers", { address });
          optionalReturnValues.push(signersInfo);
        }
        if (optionalReturnValues.length == 0) {
          console.log(ethers);
          return ethers;
        } else if (optionalReturnValues.length == 1) {
          console.log(optionalReturnValues[0]);
          return optionalReturnValues[0];
        }
        console.log(optionalReturnValues);
        return optionalReturnValues;
      } catch (err) {
        console.error(err);
      }
    }
  );

internalTask(
  "ethers:signer",
  "Returns the default buidler-ethers Signer object"
)
  .addFlag("address", "Return the signer._address")
  .addFlag("ethbalance", "Logs the default Signer's ETH balance")
  .addOptionalParam("block", "Block height to check for signer's balance")
  .setAction(async ({ address, ethbalance, block }, { ethers }) => {
    try {
      const optionalReturnValues = [];
      const [signer] = await ethers.signers();
      if (address) optionalReturnValues.push(signer._address);
      if (ethbalance) {
        let balance;
        if (block) {
          if (isNaN(block)) balance = await signer.getBalance(block);
          else balance = await signer.getBalance(utils.bigNumberify(block));
        } else {
          balance = await signer.getBalance();
        }
        optionalReturnValues.push(`${utils.formatEther(balance)} ETH`);
      }
      if (optionalReturnValues.length == 0) return signer;
      if (optionalReturnValues.length == 1) return optionalReturnValues[0];
      else return optionalReturnValues;
    } catch (error) {
      console.error(error);
    }
  });

internalTask(
  "ethers:signers",
  "Returns the BRE configured buidler-ethers Signer objects"
)
  .addFlag("address", "Log the addresses of the Signers")
  .setAction(async ({ address }, { ethers }) => {
    try {
      const signers = await ethers.signers();
      if (address) {
        const signerAddresses = [];
        for (signer of signers) signerAddresses.push(signer._address);
        return signerAddresses;
      }
      return signers;
    } catch (error) {
      console.error(error);
    }
  });

// Internal Helper Tasks
internalTask(
  "checkContractName",
  "Throws if contractname does not exist inside config.networks.networkName.contracts"
)
  .addPositionalParam("contractName", "Name of contract to check")
  .addOptionalParam("networkName", "Name of the network to check")
  .setAction(async ({ contractName }, { config, networkName }) => {
    try {
      if (networkName) await run("checkNetworkName", { networkName });
      else networkName = DEFAULT_NETWORK;
      const contracts = getNestedObj(config.networks, networkName, "contracts");
      if (!contracts.includes(contractName))
        throw new Error(
          `contractname: ${contractName} does not exist in config.networks.${networkName}.contracts`
        );
    } catch (err) {
      console.error(err);
    }
  });

internalTask(
  "checkNetworkName",
  "Throws if networkName does not exist inside config.networks"
)
  .addPositionalParam("networkName", "Name of network to check")
  .setAction(async ({ networkName }, { config }) => {
    try {
      if (!Object.keys(config.networks).includes(networkName))
        throw new Error(
          `networkName: ${networkName} does not exist in config.networks`
        );
    } catch (err) {
      console.error(err);
    }
  });
