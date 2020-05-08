// ES6 module imports via require
require("@babel/register");

// Libraries
const assert = require("assert");
const { constants, errors, utils } = require("ethers");

// Disable ethers v4 warnings e.g. for solidity overloaded fns
errors.setLogLevel("error");

// Classes
const Action = require("./src/classes/gelato/Action").default;
const Condition = require("./src/classes/gelato/Condition").default;
const GelatoProvider = require("./src/classes/gelato/GelatoProvider").default;
const Task = require("./src/classes/gelato/Task").default;
const TaskSpec = require("./src/classes/gelato/TaskSpec").default;
const TaskReceipt = require("./src/classes/gelato/TaskReceipt").default;
// Objects
const { Operation } = require("./src/classes/gelato/Action");

// Helpers
// Async
const sleep = require("./src/scripts/helpers/async/sleep").default;
// Gelato
const convertTaskReceiptArrayToObj = require("./src/scripts/helpers/gelato/convertTaskReceiptArrayToObj")
  .default;
const convertTaskReceiptObjToArray = require("./src/scripts/helpers/gelato/convertTaskReceiptObjToArray")
  .default;
// Nested Objects
const checkNestedObj = require("./src/scripts/helpers/nestedObjects/checkNestedObj")
  .default;
const getNestedObj = require("./src/scripts/helpers/nestedObjects/getNestedObj")
  .default;

// ================================= BRE extension ==================================
extendEnvironment((bre) => {
  // Classes
  bre.Action = Action;
  bre.Condition = Condition;
  bre.GelatoProvider = GelatoProvider;
  bre.Task = Task;
  bre.TaskSpec = TaskSpec;
  bre.TaskReceipt = TaskReceipt;
  // Objects
  bre.Operation = Operation;
  // Functions
  // Async
  bre.sleep = sleep;
  // Gelato
  bre.convertTaskReceiptArrayToObj = convertTaskReceiptArrayToObj;
  bre.convertTaskReceiptObjToArray = convertTaskReceiptObjToArray;
  // Nested Objects
  bre.checkNestedObj = checkNestedObj;
  bre.getNestedObj = getNestedObj;
  // Libraries
  bre.constants = constants;
  bre.utils = utils;
});

// ================================= CONFIG =========================================
// Process Env Variables
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
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
  },
  networks: {
    buidlerevm: {
      hardfork: "istanbul",
      contracts: buidlerevmConfig.contracts,
      allowUnlimitedContractSize: process.env.BUIDLER_DEBUG ? true : false,
      // Custom
      filters: { defaultFromBlock: 1 },
    },
    coverage: {
      url: "http://127.0.0.1:8555",
      // Custom
      filters: { defaultFromBlock: 1 },
    },
    localhost: {
      allowUnlimitedContractSize: process.env.BUIDLER_DEBUG ? true : false,
      filters: { defaultFromBlock: 1 },
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
    version: "0.6.6",
    optimizer: { enabled: true },
  },
};

// ================================= PLUGINS =========================================
usePlugin("@nomiclabs/buidler-ethers");
// usePlugin("buidler-gas-reporter");
usePlugin("@nomiclabs/buidler-waffle");
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
// GasAdmin, Executors, Providers, submitTask, ...
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
