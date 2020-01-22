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
const DEFAULT_NETWORK = "kovan";

module.exports = {
  defaultNetwork: DEFAULT_NETWORK,
  networks: {
    buidlerevm: {
      hardfork: "istanbul"
    },
    kovan: {
      // Standard
      accounts: { mnemonic: DEV_MNEMONIC },
      chainId: 42,
      gasPrice: 1000000000, // 1 gwei
      url: `https://kovan.infura.io/v3/${INFURA_ID}`,
      // Custom
      addressBook: {
        EOA: {
          // Kovan
          luis: "0x203AdbbA2402a36C202F207caA8ce81f1A4c7a72",
          hilmar: "0xe2A8950bC498e19457BE5bBe2C25bC1f535C743e"
        },
        erc20: {
          // Kovan
          // Tokens
          DAI: "0xC4375B7De8af5a38a93548eb8453a498222C4fF2",
          "0xC4375B7De8af5a38a93548eb8453a498222C4fF2": "DAI",
          KNC: "0xad67cB4d63C9da94AcA37fDF2761AaDF780ff4a2",
          "0xad67cB4d63C9da94AcA37fDF2761AaDF780ff4a2": "KNC",
          // ==== BzX pTokens ====
          // Long
          dLETH2x: "0x934b43143e984052961EB46f5bDE633F33bCDB80",
          "0x934b43143e984052961EB46f5bDE633F33bCDB80": "dLETH2x",
          dLETH3x: "0x0015Cfd9722B43ac277f37887df14a00109fc689",
          "0x0015Cfd9722B43ac277f37887df14a00109fc689": "dLETH3x",
          dLETH4x: "0x0E5f87BDcD6285F930b6bbcC3E21CA9d985e12fE",
          "0x0E5f87BDcD6285F930b6bbcC3E21CA9d985e12fE": "dLETH4x",
          // Short
          dsETH: "0xD4Fd1467c867808dc7B393dBc863f34783F37d3E",
          "0xD4Fd1467c867808dc7B393dBc863f34783F37d3E": "dsETH",
          dsETH2x: "0x2EBfbCf2d67867a05BCAC0FbCA54019163253988",
          "0x2EBfbCf2d67867a05BCAC0FbCA54019163253988": "dsETH2x",
          dsETH3x: "0xB56EA362eA9B1D030213A47eAA452dFfd84CB5a2",
          "0xB56EA362eA9B1D030213A47eAA452dFfd84CB5a2": "dsETH3x",
          dsETH4x: "0x9486ac55ed81758787fcdda98e6Ce35b01CDBE72",
          "0x9486ac55ed81758787fcdda98e6Ce35b01CDBE72": "dsETH4x"
        },
        executor: {
          // Kovan
          default: "0x203AdbbA2402a36C202F207caA8ce81f1A4c7a72"
        },
        kyber: {
          // Kovan
          proxy: "0x692f391bCc85cefCe8C237C01e1f636BbD70EA4D"
        },
        userProxy: {
          // Kovan
          luis: "0x9a0Bf55Fc1781609032c856D54e9089F4224198b"
        }
      },
      contracts: [
        // Kovan
        "ActionBzxPtokenBurnToToken",
        "ActionBzxPtokenMintWithToken",
        "ActionERC20Transfer",
        "ActionERC20TransferFrom",
        "KovanActionKyberTrade",
        "ActionMultiMintForTriggerTimestampPassed",
        "GelatoCore",
        "TriggerBalance",
        "TriggerKyberRateKovan",
        "TriggerTimestampPassed"
      ],
      deployments: {
        // ========== KOVAN ===========
        // === Actions ===
        // BzX
        ActionBzxPtokenBurnToToken:
          "0xA5d7aFfBe3049efa9BC5DC23A16946cd7CE70061",
        ActionBzxPtokenMintWithToken:
          "0x10C06Ab7F13E9Ae1e3c8cD82370C2Fc01002a9EF",
        // erc20
        ActionERC20Transfer: "0x83a9a1B430e1d738D85859B9Ec509426b4B36058",
        ActionERC20TransferFrom: "0x3E9665BB5C3bBa2A89a14c289fE503D50fE44319",
        // kyber
        KovanActionKyberTrade: "0x48c8BCD7aB7ACf9A485643262D1b0e447C156BA1",
        // ==== Gelato Core ===
        GelatoCore: "0x8456FEcB4F2FbcB5992b3533428F82f98C40f55C",
        // Luis User Proxy
        GelatoUserProxy: "0x9a0Bf55Fc1781609032c856D54e9089F4224198b",
        // === Triggers ===
        // balance
        TriggerBalance: "0xc0993255E46FD2E911d92fa63477e061b917aA14",
        // kyber
        TriggerKyberRateKovan: "0xfEe2C4Fd7Be69AC4353230e56EAe6a156c9d4dC4",
        // time
        TriggerTimestampPassed: "0x328eAA9C817383e0A2fc815F810BCA7FF3ea6288"
      }
    },
    ropsten: {
      // Standard
      accounts: { mnemonic: DEV_MNEMONIC },
      chainId: 3,
      gasPrice: 20000000000, // 20 gwei
      url: `https://ropsten.infura.io/v3/${INFURA_ID}`,
      // Custom
      addressBook: {
        EOA: {
          // Ropsten
          luis: "0x203AdbbA2402a36C202F207caA8ce81f1A4c7a72",
          hilmar: "0xe2A8950bC498e19457BE5bBe2C25bC1f535C743e"
        },
        erc20: {
          // Ropsten
          DAI: "0xad6d458402f60fd3bd25163575031acdce07538d",
          "0xad6d458402f60fd3bd25163575031acdce07538d": "DAI",
          KNC: "0x4e470dc7321e84ca96fcaedd0c8abcebbaeb68c6",
          "0x4e470dc7321e84ca96fcaedd0c8abcebbaeb68c6": "KNC",
          MANA: "0x72fd6C7C1397040A66F33C2ecC83A0F71Ee46D5c",
          "0x72fd6C7C1397040A66F33C2ecC83A0F71Ee46D5c": "MANA",
          WETH: "0xbca556c912754bc8e7d4aad20ad69a1b1444f42d",
          "0xbca556c912754bc8e7d4aad20ad69a1b1444f42d": "WETH"
        },
        executor: {
          // Ropsten
          default: "0x203AdbbA2402a36C202F207caA8ce81f1A4c7a72"
        },
        kyber: {
          // Ropsten
          proxy: "0x818E6FECD516Ecc3849DAf6845e3EC868087B755"
        },
        userProxy: {
          // Ropsten
          luis: "0x1631B08A31Ecc1e125939002326E4b281E9eCd75"
        }
      },
      contracts: [
        // Ropsten
        "TriggerBalance"
      ],
      deployments: {
        // Ropsten
        TriggerBalance: "0xaFa77E70C22F5Ab583A9Eae6Dc7290e6264832Af"
      }
    }
  },
  solc: {
    version: "0.6.1",
    optimizer: { enabled: true, runs: 200 }
  }
};

// ================================= PLUGINS =========================================
usePlugin("@nomiclabs/buidler-ethers");

// ================================= TASKS =========================================
// task action function receives the Buidler Runtime Environment as second argument

// ============= ABI ============================
require("./scripts/buidler_tasks/abi/collection.tasks.abi");

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
    const ethUSDPrice = await etherscanProvider.getEtherPrice();
    console.log(`\nETH price in USD: ${ethUSDPrice}$\n`);
    return ethUSDPrice;
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});

// ============== ETHERS ==============================================================
require("./scripts/buidler_tasks/ethers/collection.tasks.ethers");

// ============= GELATO ===============================================================
// _____ ACTIONS ______________________
require("./scripts/buidler_tasks/gelato/actions/collection.tasks.actions");
// _____ CORE ______________________
// Accounting, UserProxyManager, Minting, ...
require("./scripts/buidler_tasks/gelato/core/collection.gelato-core.tasks");
// _____ DAPPS ______________________
require("./scripts/buidler_tasks/gelato/dapps/collection.tasks.dapps");
// _____ Triggers ______________________
require("./scripts/buidler_tasks/gelato/triggers/collection.tasks.triggers");

// ============== INTERNAL HELPER TASKS ================================================
// encoding, naming ....
require("./scripts/buidler_tasks/internal/collection.internalTasks");
