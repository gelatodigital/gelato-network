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
      gasPrice: 20000000000, // 20 gwei
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
          DAI: "0xC4375B7De8af5a38a93548eb8453a498222C4fF2",
          "0xC4375B7De8af5a38a93548eb8453a498222C4fF2": "DAI",
          KNC: "0xad67cB4d63C9da94AcA37fDF2761AaDF780ff4a2",
          "0xad67cB4d63C9da94AcA37fDF2761AaDF780ff4a2": "KNC"
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
          luis: "0xbEb2CfD15Fd188634f2f94A7471d194b80D80b12"
        }
      },
      contracts: [
        // Kovan
        "ActionBzxPtokenMintWithToken",
        "ActionERC20Transfer",
        "ActionERC20TransferFrom",
        "ActionKyberTrade",
        "ActionMultiMintForTriggerTimestampPassed",
        "GelatoCore",
        "TriggerBalance",
        "TriggerKyberRate",
        "TriggerTimestampPassed"
      ],
      deployments: {
        // Kovan
        ActionBzxPtokenMintWithToken:
          "0xF1531B0B71aa97EaF46876EF73dc4218F0e02DFC",
        ActionERC20Transfer: "0x00eC0c566e16d03b089ff38DD38BA933279886D8",
        ActionERC20TransferFrom: "0x83D85e7b95eAe643Dc58c6C397701Bf3dd3Dff91",
        ActionKyberTrade: "0x2265a909E7678f16f5622941836d14aEfda8f2A2",
        GelatoCore: "0xaD944A44Bd6d2BEAa15c49BF300AeDde5d2936B9",
        GelatoUserProxy: "0xbEb2CfD15Fd188634f2f94A7471d194b80D80b12",
        TriggerBalance: "0xe4bD22dfdfcD88df04944be0c745e9961e8dc22b",
        TriggerKyberRate: "0x40811cbd52F9C8490c474DF20D89CE61d93D3567",
        TriggerTimestampPassed: "0x591DB4982dD2E184b8F4b8DA9599295Dd379F732"
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
        "ActionBzxPtokenMintWithToken",
        "ActionERC20Transfer",
        "ActionERC20TransferFrom",
        "ActionKyberTrade",
        "ActionMultiMintForTriggerTimestampPassed",
        "GelatoCore",
        "TriggerBalance",
        "TriggerKyberRate",
        "TriggerTimestampPassed"
      ],
      deployments: {
        // Ropsten
        ActionBzxPtokenMintWithToken:
          "0x732033F075b60114E3C0392A621f10F2E8EE0D13",
        ActionERC20Transfer: "0xF48Fc3D81EFc8415dB2daF644cab7F192Da1C42d",
        ActionERC20TransferFrom: "0x8FdAf109e391C304939CF64C9B9912b320AdfE56",
        ActionKyberTrade: "0x67f647bDF012A718d5F9bD9C7bEd6e5a2023ccC6",
        ActionMultiMintForTriggerTimestampPassed:
          "0x87b9f40e569C3a58C1F07a5E929a5b27edE74D27",
        GelatoCore: "0x563700A8A6740C8a474DF8F289716afDc30ED07a",
        GelatoUserProxy: "0x1631B08A31Ecc1e125939002326E4b281E9eCd75",
        TriggerBalance: "0xaf4c11A90e98D0C5ecFb403C62Cc8Dfe8DF11030",
        TriggerKyberRate: "0xbcb765cb4FF012B019068626320c9c577f3D6327",
        TriggerTimestampPassed: "0x20F8EE3153F11Da43137478B6897c9c4cC438B50"
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
