// ES6 module imports via require
require("@babel/register");
// Libraries
const assert = require("assert");
const { providers, utils } = require("ethers");
// Helpers
const checkNestedObj = require("./scripts/helpers/nestedObjects/checkNestedObj")
  .default;
const getNestedObj = require("./scripts/helpers/nestedObjects/getNestedObj")
  .default;
const sleep = require("./scripts/helpers/async/sleep").default;

// ================================= BRE extension ==================================
extendEnvironment(bre => {
  bre.checkNestedObj = checkNestedObj;
  bre.getNestedObj = getNestedObj;
  bre.sleep = sleep;
});

// ================================= CONFIG =========================================
// Env Variables
require("dotenv").config();
const DEV_MNEMONIC = process.env.DEV_MNEMONIC;
const INFURA_ID = process.env.INFURA_ID;
assert.ok(DEV_MNEMONIC, "no mnenomic in process.env");
assert.ok(INFURA_ID, "no Infura ID in process.env");

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
          DAI: "0xad6d458402f60fd3bd25163575031acdce07538d",
          "0xad6d458402f60fd3bd25163575031acdce07538d": "DAI",
          KNC: "0x4e470dc7321e84ca96fcaedd0c8abcebbaeb68c6",
          "0x4e470dc7321e84ca96fcaedd0c8abcebbaeb68c6": "KNC",
          WETH: "0xbca556c912754bc8e7d4aad20ad69a1b1444f42d",
          "0xbca556c912754bc8e7d4aad20ad69a1b1444f42d": "WETH"
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

// ================================= PLUGINS =========================================
usePlugin("@nomiclabs/buidler-ethers");

// ================================= TASKS =========================================
// task action function receives the Buidler Runtime Environment as second argument

// ============= BLOCK ============================
require("./scripts/buidler_tasks/block/collection.tasks.block");

// ============= BRE ============================
// BRE, BRE-CONFIG(:networks), BRE-NETWORK
require("./scripts/buidler_tasks/bre/collection.tasks.bre");

// ============= DEPLOY ============================
require("./scripts/buidler_tasks/deploy/task.deploy");

// ============= ERC20 ============================
require("./scripts/buidler_tasks/erc20/collection.tasks.erc20");

// ============== ETH =================================================================
task(
  "eth-balance",
  `Return or (--log) an [--address] ETH balance on [--network] (default: ${DEFAULT_NETWORK})`
)
  .addParam("address", "The account's address")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ address, log }, { ethers, network }) => {
    try {
      const balance = await ethers.provider.getBalance(address);
      if (log)
        console.log(`\n${utils.formatEther(balance)} ETH (on ${network.name})`);
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

// ============== ETHERS ==============================================================
task(
  "ethers",
  `Return (or --log) properties of ethers-buidler plugin on [--network] (default: ${DEFAULT_NETWORK})`
)
  .addFlag("address", "Use with --signer or --signers to log addresses")
  .addOptionalParam(
    "block",
    "Use with --signer --ethBalance to log balance at block height"
  )
  .addFlag("buidlerprovider", "Show the buidler-ethers provider")
  .addFlag("ethbalance", "Use with --signer to log Signer's ethBalance")
  .addFlag("log", "Logs return values to stdout")
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
        address,
        block,
        buidlerprovider,
        ethbalance,
        log,
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
          if (log) console.log(ethers);
          return ethers;
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

// ______ ethers:signer(s) ______________________
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

// ============== INTERNAL HELPER TASKS ================================================
require("./scripts/buidler_tasks/internal/internalTaskCollection");
