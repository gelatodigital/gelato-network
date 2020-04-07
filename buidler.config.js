// ES6 module imports via require
require("@babel/register");
// Libraries
const assert = require("assert");
const { utils } = require("ethers");
// Classes
const ActionWithGasPriceCeil = require("./src/classes/gelato/actionWithGasPriceCeil")
  .default;
const ExecClaim = require("./src/classes/gelato/execClaim").default;
// Helpers
const checkNestedObj = require("./src/scripts/helpers/nestedObjects/checkNestedObj")
  .default;
const getNestedObj = require("./src/scripts/helpers/nestedObjects/getNestedObj")
  .default;
const sleep = require("./src/scripts/helpers/async/sleep").default;

// ================================= BRE extension ==================================
extendEnvironment((bre) => {
  // Classes
  bre.ActionWithGasPriceCeil = ActionWithGasPriceCeil;
  bre.ExecClaim = ExecClaim;
  // Functions
  bre.checkNestedObj = checkNestedObj;
  bre.getNestedObj = getNestedObj;
  bre.sleep = sleep;
});

// ================================= CONFIG =========================================
// Env Variables
require("dotenv").config();
const DEV_MNEMONIC = process.env.DEV_MNEMONIC;
const MAINNET_MNEMONIC = process.env.MAINNET_MNEMONIC;
const INFURA_ID = process.env.INFURA_ID;
const DEFAULT_NETWORK = process.env.DEFAULT_NETWORK;
assert.ok(DEV_MNEMONIC, "no DEV_MNEMONIC in process.env");
assert.ok(MAINNET_MNEMONIC, "no MAINNET_MNEMONIC in process.env");
assert.ok(INFURA_ID, "no Infura ID in process.env");

// Config Files
const buidlerevmConfig = require("./buidler/config/networks/buidlerevmConfig");
const kovanConfig = require("./buidler/config/networks/kovanConfig");
const rinkebyConfig = require("./buidler/config/networks/rinkebyConfig");
const mainnetConfig = require("./buidler/config/networks/mainnetConfig");

module.exports = {
  defaultNetwork: DEFAULT_NETWORK ? DEFAULT_NETWORK : "buidlerevm",
  networks: {
    buidlerevm: {
      hardfork: "istanbul",
      contracts: buidlerevmConfig.contracts,
      gas: 15000000,
      blockGasLimit: 20000000,
    },
    coverage: {
      url: "http://127.0.0.1:8555",
    },
    mainnet: {
      // Standard
      accounts: { mnemonic: MAINNET_MNEMONIC },
      chainId: 1,
      gas: "auto",
      gasPrice: parseInt(utils.parseUnits("5", "gwei")),
      gasMultiplier: 1.5,
      url: `https://mainnet.infura.io/v3/${INFURA_ID}`,
      // Custom
      addressBook: mainnetConfig.addressBook,
      contracts: mainnetConfig.contracts,
      deployments: mainnetConfig.deployments,
      filters: mainnetConfig.filters,
    },
    kovan: {
      // Standard
      accounts: { mnemonic: DEV_MNEMONIC },
      chainId: 42,
      gasPrice: parseInt(utils.parseUnits("1", "gwei")),
      url: `https://kovan.infura.io/v3/${INFURA_ID}`,
      // Custom
      addressBook: kovanConfig.addressBook,
      contracts: kovanConfig.contracts,
      deployments: kovanConfig.deployments,
      filters: kovanConfig.filters,
    },
    rinkeby: {
      // Standard
      accounts: { mnemonic: DEV_MNEMONIC },
      chainId: 4,
      gasPrice: parseInt(utils.parseUnits("8", "gwei")),
      url: `https://rinkeby.infura.io/v3/${INFURA_ID}`,
      // Custom
      addressBook: rinkebyConfig.addressBook,
      contracts: rinkebyConfig.contracts,
      deployments: rinkebyConfig.deployments,
      filters: rinkebyConfig.filters,
    },
  },
  solc: {
    version: "0.6.4",
    optimizer: { enabled: true },
  },
};

// ================================= PLUGINS =========================================
// buidler-ethers
usePlugin("@nomiclabs/buidler-ethers");
// buidler-waffle
usePlugin("@nomiclabs/buidler-waffle");
// solidity-coverage
usePlugin("solidity-coverage");

// ================================= TASKS =========================================
// task action function receives the Buidler Runtime Environment as second argument

// ============== ABI
require("./buidler/tasks/abi/collection.tasks.abi");

// ============== BLOCK
require("./buidler/tasks/block/collection.tasks.block");

// ============== BRE
// BRE, BRE-CONFIG(:networks), BRE-NETWORK
require("./buidler/tasks/bre/collection.tasks.bre");

// ============== DAPPS
require("./buidler/tasks/dapps/collection.tasks.dapps");

// ============== DEBUGGING
require("./buidler/tasks/debugging/collection.tasks.debugging");

// ============== DEPLOY
require("./buidler/tasks/deploy/collection.tasks.deploy");

// ============== ERC20
require("./buidler/tasks/erc20/collection.tasks.erc20");

// ============== ETH
require("./buidler/tasks/eth/collection.tasks.eth");

// ============== ETHERS
require("./buidler/tasks/ethers/collection.tasks.ethers");

// ============== EVENTS
require("./buidler/tasks/events/collection.tasks.events");

// ============= GELATO
// _____ ACTIONS
require("./buidler/tasks/gelato/actions/collection.tasks.actions");
// _____ CORE
// GasAdmin, Executors, Providers, Minting, ...
require("./buidler/tasks/gelato/core/collection.tasks.gelato-core");
// _____ CONDITIONS
require("./buidler/tasks/gelato/conditions/collection.tasks.conditions");

// ============= USER PROXIES (GelatoUserProxy, GnosisSafeProxy,...)
require("./buidler/tasks/user_proxies/collection.tasks.gelato-user-proxies");

// ======================== INTERNAL HELPER TASKS ======================================
// encoding, naming ....
require("./buidler/tasks/internal/collection.internalTasks");

// ======================== VIEW FUNCS ======================================
require("./buidler/tasks/view/collection.viewTasks");
