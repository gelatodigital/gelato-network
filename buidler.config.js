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
      hardfork: "istanbul"
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${INFURA_ID}`,
      chainId: 3,
      accounts: { mnemonic: DEV_MNEMONIC },
      addressBook: {
        erc20: {
          DAI: 0xad6d458402f60fd3bd25163575031acdce07538d,
          KNC: 0x4e470dc7321e84ca96fcaedd0c8abcebbaeb68c6,
          MANA: 0x72fd6c7c1397040a66f33c2ecc83a0f71ee46d5c,
          OMG: 0x4bfba4a8f28755cb2061c413459ee562c6b9c51b,
          WETH: 0xbca556c912754bc8e7d4aad20ad69a1b1444f42d
        }
      },
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
  `Logs the current block number on [--network] (default: ${DEFAULT_NETWORK})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }, { ethers }) => {
    try {
      const blockNumber = await ethers.provider.getBlockNumber();
      if (log)
        console.log(
          `\n${ethers.provider._buidlerProvider._networkName}: ${blockNumber}\n`
        );
      return blockNumber;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });

task("bre", "Return (or --log) the current Buidler Runtime Environment")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ log }, bre) => {
    try {
      if (log) console.dir(bre);
      return bre;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });

task("bre-config", "Return (or --log) BRE.config properties")
  .addFlag(
    "contracts",
    "Use with --networks for a list of contracts available for deployment on --networkname"
  )
  .addFlag("defaultnetwork", "Config of default network")
  .addFlag(
    "deployments",
    "Use with --networks for an address book of deployed contract instances on --networkname"
  )
  .addFlag("log", "Logs return values to stdout")
  .addFlag("networks", "Config of networks")
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
        log,
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
        if (contracts || deployments || networks) {
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
          if (log) console.log(config);
          return config;
        } else if (optionalReturnValues.length == 1) {
          if (log) console.log(optionalReturnValues[0]);
          return optionalReturnValues[0];
        }
        if (log) console.log(optionalReturnValues);
        return optionalReturnValues;
      } catch (err) {
        console.error(err);
        process.exit(1);
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
      else networkname = DEFAULT_NETWORK;
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
      process.exit(1);
    }
  });

internalTask(
  "bre-config:networks:contracts",
  `Returns bre.config.networks.networkName.contracts`
)
  .addParam("networkname", "Name of network for which to read contracts field")
  .setAction(async ({ networkname }, { config }) => {
    try {
      if (checkNestedObj(config, "networks", networkname, "contracts"))
        return config.networks[networkname].contracts;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });

internalTask(
  "bre-config:networks:deployments",
  `Returns bre.config.networks.networkName.deployments`
)
  .addParam("networkname", "Name of network for which to read contracts field")
  .setAction(async ({ networkname }, { config }) => {
    try {
      if (checkNestedObj(config, "networks", networkname, "deployments"))
        return config.networks[networkname].deployments;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });

task("bre-network", `Return (or --log) BRE.network properties`)
  .addFlag("c", "Return the BRE network config")
  .addFlag("log", "Logs return values to stdout")
  .addFlag("name", "Return the currently connected BRE network name")
  .addFlag("provider", "Return the currently connected BRE network provider")
  .setAction(async ({ c: config, log, name, provider }, { network }) => {
    try {
      const optionalReturnValues = [];
      if (config) optionalReturnValues.push(network.config);
      if (name) optionalReturnValues.push(network.name);
      if (provider) optionalReturnValues.push(network.provider);

      if (optionalReturnValues.length == 0) {
        if (log) console.log(network);
        return network;
      } else if (optionalReturnValues.length == 1) {
        if (log) console.log(optionalReturnValues[0]);
        return optionalReturnValues[0];
      }
      if (log) console.log(optionalReturnValues);
      return optionalReturnValues;
    } catch (err) {
      console.error(err);
      process.exit(1);
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
  .addFlag("clean")
  .addFlag("compile", "Compile before deploy")
  .addFlag("log", "Logs to stdout")
  .setAction(async (taskArgs, bre) => {
    try {
      await require("./scripts/buidler_tasks/deploy/deployWithoutConstructorArgs").default(
        taskArgs,
        bre
      );
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });

task("erc20", "A suite of erc20 related tasks")
  .addPositionalParam(
    "erc20Address",
    "The address of the erc20 contract to perform tasks on"
  )
  .addFlag(
    "allowance",
    "Return (or --log) <erc20Address> allowance by --owner to --spender"
  )
  .addOptionalParam("amount", "Uint: use with --approve")
  .addFlag("approve", "Send tx to <erc20Address> to approve --spender")
  .addFlag("log", "Logs return values to stdout")
  .addOptionalParam("owner", "Address: use with (--allowance & --spender)")
  .addOptionalParam(
    "spender",
    "Address: use with --approve or (--allowance & --owner)"
  )
  .setAction(async (taskArgs, { ethers }) => {
    if (taskArgs) {
    }
  });

internalTask(
  "erc20:approve",
  `Approves --spender for <erc20> <amount> on [--network] (default: ${DEFAULT_NETWORK})`
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
      process.exit(1);
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
      process.exit(1);
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
      process.exit(1);
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
    process.exit(1);
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
        process.exit(1);
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
      process.exit(1);
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
      process.exit(1);
    }
  });

// Internal Helper Tasks
internalTask(
  "checkAddressBook",
  "Checks config.networks.networkName.addressbook for <category> and optionally <entry>"
)
  .addPositionalParam("category", "Name of the category to search under")
  .addOptionalParam("entry", "Name of the entry to check")
  .addOptionalParam("networkName", "Name of the network to search under")
  .setAction(async ({ category, entry, networkName }) => {
    try {
      networkName = await run("handleNetworkname", { networkName });
      await run("checkAddressBook:network", { networkName });
      await run("checkAddressBook:category", { category, networkName });
      if (entry) await run("checkAddressBook:entry", { entry });
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });

internalTask(
  "checkAddressBook:category",
  "Throws if the category does not exist inside config.networks.addressbook"
)
  .addParam("category", "Name of the category to search under")
  .addParam("networkName", "Name of the network to search under")
  .setAction(async ({ category, networkName }, { config }) => {
    try {
      if (
        !checkNestedObj(config.networks, networkName, "addressBook", category)
      )
        throw new Error(
          `Category: ${category} does not exist in config.networks.${networkName}.addressBook`
        );
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });

internalTask(
  "checkAddressBook:entry",
  "Throws if the entry does not exist inside config.networks.addressbook"
)
  .addParam("category", "Name of the category to search under")
  .addParam("entry", "Name of the entry to check")
  .setAction(async ({ category, entry }, { config }) => {
    try {
      if (
        !checkNestedObj(
          config.networks,
          networkName,
          "addressBook",
          category,
          entry
        )
      )
        throw new Error(
          `Entry: ${entry} does not exist in config.networks.${networkName}.addressBook.${category}`
        );
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });

internalTask(
  "checkAddressBook:network",
  "Throws if no addressbook for config.networks.networkName"
)
  .addParam("networkName", "Name of the network to search under")
  .setAction(async ({ networkName }, { config }) => {
    try {
      if (!checkNestedObj(config.networks, networkName, "addressBook"))
        throw new Error(`No addressBook for network: ${networkName}`);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });

internalTask(
  "checkContractName",
  "Throws if contractname does not exist inside config.networks.networkName.contracts"
)
  .addParam("contractName", "Name of contract to check")
  .addOptionalParam("networkName", "Name of the network to check")
  .setAction(async ({ contractName }, { config, networkName }) => {
    try {
      networkName = await run("handleNetworkname");
      const contracts = getNestedObj(config.networks, networkName, "contracts");
      if (!contracts.includes(contractName))
        throw new Error(
          `contractname: ${contractName} does not exist in config.networks.${networkName}.contracts`
        );
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });

internalTask(
  "checkNetworkName",
  "Throws if networkName does not exist inside config.networks"
)
  .addParam("networkName", "Name of network to check")
  .setAction(async ({ networkName }, { config }) => {
    try {
      if (!Object.keys(config.networks).includes(networkName))
        throw new Error(
          `networkName: ${networkName} does not exist in config.networks`
        );
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });

internalTask(
  "handleNetworkname",
  `Throws if networkName is invalid OR returns the Default Network (${DEFAULT_NETWORK}) if networkName is undefined`
)
  .addParam("networkName")
  .setAction(async ({ networkName }) => {
    try {
      if (networkName) await run("checkNetworkName", { networkName });
      else networkName = DEFAULT_NETWORK;
      return networkName;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
