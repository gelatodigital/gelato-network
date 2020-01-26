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
      hardfork: "istanbul",
      contracts: [
        // BuidlerEVM
        "ActionBzxPtokenBurnToToken",
        "ActionBzxPtokenMintWithToken",
        "ActionERC20Transfer",
        "ActionERC20TransferFrom",
        "ActionKyberTradeKovan",
        "ActionMultiMintForConditionTimestampPassed",
        "GelatoCore",
        "ConditionBalance",
        "ConditionKyberRateKovan",
        "ConditionTimestampPassed",
        // Testing
        "Action",
        "Core",
        "UserProxy"
      ]
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
          ETH: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
          proxy: "0x692f391bCc85cefCe8C237C01e1f636BbD70EA4D"
        },
        userProxy: {
          // Kovan
          luis: "0x217f828cA13d99C9bBaaf07fc95A9394d6BC795F"
        }
      },
      contracts: [
        // Kovan
        "ActionBzxPtokenBurnToToken",
        "ActionBzxPtokenMintWithToken",
        "ActionERC20Transfer",
        "ActionERC20TransferFrom",
        "ActionKyberTradeKovan",
        "ActionMultiMintForConditionTimestampPassed",
        "GelatoCore",
        "ConditionBalance",
        "ConditionKyberRateKovan",
        "ConditionTimestampPassed"
      ],
      deployments: {
        // ========== KOVAN ===========
        // === Actions ===
        // BzX
        ActionBzxPtokenBurnToToken:
          "0x62CC3fC9Cf620a48a6587Fd0e3c548bAcEFfAd21",
        ActionBzxPtokenMintWithToken:
          "0x1e2E09a49bda3fc44b792D4aa607Fa301698A91f",
        // erc20
        ActionERC20Transfer: "0xE989890AC8eF57B0CBd1b951cEfd327b2727e490",
        ActionERC20TransferFrom: "0x99cB92f9f853918773de899EBCd942f50f9A6ABb",
        // kyber
        ActionKyberTradeKovan: "0xE5656d2dAAbF6a94F7B05315735D33193246289a",
        // ==== Gelato Core ===
        GelatoCore: "0xEFD00E5Ce7b62CA41190Da3818d2427f04427117",
        // === Conditions ===
        // balance
        ConditionBalance: "0xA5EA265F49A574BA5CfeEdB7cE5fc9E330DF1441",
        // kyber
        ConditionKyberRateKovan: "0x4c741109e77D579754AcA15753fa34FA02CBb154",
        // time
        ConditionTimestampPassed: "0x036810290a0D1d07a3329baaE54FE65E720e4491"
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
        "ConditionBalance"
      ],
      deployments: {
        // Ropsten
        ConditionBalance: "0xaFa77E70C22F5Ab583A9Eae6Dc7290e6264832Af"
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
// _____ Conditions ______________________
require("./scripts/buidler_tasks/gelato/conditions/collection.tasks.conditions");

// ============== INTERNAL HELPER TASKS ================================================
// encoding, naming ....
require("./scripts/buidler_tasks/internal/collection.internalTasks");

task("slice")
  .addOptionalPositionalParam("payload")
  .setAction(async ({ payload }) => {
    try {
      if (network.name != "buidlerevm") throw new Error("buidlerevm only");

      const contractname = "ActionBzxPtokenMintWithToken";

      if (!payload)
        payload = await run(`gc-mint:defaultpayload:${contractname}`);

      const contractaddress = await run("deploy", {
        contractname,
        network: "buidlerevm"
      });

      const contract = await run("instantiateContract", {
        contractname,
        contractaddress,
        read: true
      });

      const result = await contract.actionConditionsCheck(payload);

      console.log(result);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });

task("revert").setAction(async () => {
  try {
    if (network.name != "buidlerevm") throw new Error("buidlerevm only");

    let contractname = "Action";
    const actionAddress = await run("deploy", {
      contractname,
      network: "buidlerevm"
    });

    contractname = "UserProxy";
    const userProxyAddress = await run("deploy", {
      contractname,
      network: "buidlerevm"
    });

    contractname = "Core";
    const coreAddress = await run("deploy", {
      contractname,
      network: "buidlerevm"
    });

    const coreContract = await run("instantiateContract", {
      contractname,
      contractaddress: coreAddress,
      write: true
    });

    await coreContract.catchErrorString(userProxyAddress, actionAddress);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
});
