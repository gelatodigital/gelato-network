// Javascript Ethereum API Library
const ethers = require("ethers");

// Logging
const debug = require("debug")("executornode");

// Helpers
const sleep = require("./helpers/sleep.js").sleep;

// ENV VARIABLES for exec-debug (heroku local default fetches from .env)
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const DEV_MNEMONIC = process.env.DEV_MNEMONIC;
const INFURA_ID = process.env.INFURA_ID;
debug(
  `\n\t\t env variables configured: ${DEV_MNEMONIC !== undefined &&
    INFURA_ID !== undefined}`
);

// Contract Addresses for instantiation
let gelatoCoreAddress;

// Setting up Provider and Signer (wallet)
let provider;
if (process.env.ROPSTEN) {
  provider = new ethers.providers.InfuraProvider("ropsten", INFURA_ID);
  gelatoCoreAddress = "0x624f09392ae014484a1aB64c6D155A7E2B6998E6";
  debug(`\n\t\t ✅ connected to ROPSTEN ✅ \n`);
} else if (process.env.RINKEBY) {
  provider = new ethers.providers.InfuraProvider("rinkeby", INFURA_ID);
  gelatoCoreAddress = "0x0e7dDacA829CD452FF341CF81aC6Ae4f0D2328A7";
  debug(`\n\t\t ✅ connected to RINKEBY ✅ \n`);
} else {
  debug(`\n\t\t ❗NO NETWORK DEFINED ❗\n`);
}

const wallet = ethers.Wallet.fromMnemonic(DEV_MNEMONIC);
const connectedWallet = wallet.connect(provider);

// Read-Write Instance of GelatoCore
const gelatoCoreContractABI = [
  "function canExecute(address _trigger, bytes _triggerPayload, address _userProxy, bytes _actionPayload, uint256 _executeGas, uint256 _executionClaimId, uint256 _executionClaimExpiryDate, uint256 _executorFee) view returns (uint8)",
  "function execute(address _trigger, bytes _triggerPayload, address _userProxy, bytes _actionPayload, address _action, uint256 _executeGas, uint256 _executionClaimId, uint256 _executionClaimExpiryDate, uint256 _executorFee) returns (uint8 executionResult)",
  "event LogNewExecutionClaimMinted(address indexed selectedExecutor, uint256 indexed executionClaimId, address indexed userProxy, bytes actionPayload, uint256 executeGas, uint256 executionClaimExpiryDate, uint256 executorFee)",
  "event LogTriggerActionMinted(uint256 indexed executionClaimId, address indexed trigger, bytes triggerPayload, address indexed action)",
  "event LogClaimExecutedAndDeleted(uint256 indexed executionClaimId, address indexed userProxy, address indexed executor, uint256 gasUsedEstimate, uint256 gasPriceUsed, uint256 executionCostEstimate, uint256 executorPayout)",
  "event LogExecutionClaimCancelled(uint256 indexed executionClaimId, address indexed userProxy, address indexed cancelor)"
];
const gelatoCoreContract = new ethers.Contract(
  gelatoCoreAddress,
  gelatoCoreContractABI,
  connectedWallet
);

// The block from which we start
let searchFromBlock = process.env.BLOCK;
debug(`\n\t\t Starting from block number: ${searchFromBlock}`);
if (searchFromBlock === "") {
  throw new Error("You must call this script with 'export BLOCK=NUMBER;'");
}

// This gets executed with node
async function main() {
  queryChainAndExecute();
  setInterval(queryChainAndExecute, 30 * 1000);
}
main().catch(err => debug(err));

// Fetch minted and not burned executionClaims
let mintedClaims = {};
// Record the executionClaimIds currently being executed
let beingExecuted = {};
// Record the number of failed "executable" execute txHash
let failedExecuteAttempts = {};
// The blacklist of buggy claims that wont get execution attempts no 🤶
let blacklist = {};

// The logic that gets executed from inside main()
async function queryChainAndExecute() {
  let currentBlock = await provider.getBlockNumber();
  debug(`\n\t\t Starting from block number: ${searchFromBlock}`);
  debug(`\n\t\t Current block number:       ${searchFromBlock}`);
  debug(`\n\t\t Running Executor Node from: ${wallet.address}\n`);

  // Log Parsing
  let iface = new ethers.utils.Interface(gelatoCoreContractABI);

  // LogNewExecutionClaimMinted
  let topicMinted = ethers.utils.id(
    "LogNewExecutionClaimMinted(address,uint256,address,bytes,uint256,uint256,uint256)"
  );
  let filterMinted = {
    address: gelatoCoreAddress,
    fromBlock: parseInt(searchFromBlock),
    topics: [topicMinted]
  };
  try {
    const logsMinted = await provider.getLogs(filterMinted);
    logsMinted.forEach(log => {
      if (log !== undefined) {
        const parsedLog = iface.parseLog(log);
        const executionClaimId = parsedLog.values.executionClaimId.toString();
        debug(
          `\t\tLogNewExecutionClaimMinted:\n\t\texecutionClaimId: ${executionClaimId}\n`
        );
        mintedClaims[executionClaimId] = {
          selectedExecutor: parsedLog.values.selectedExecutor,
          executionClaimId: executionClaimId,
          userProxy: parsedLog.values.userProxy,
          actionPayload: parsedLog.values.actionPayload,
          executeGas: parsedLog.values.executeGas,
          executionClaimExpiryDate: parsedLog.values.executionClaimExpiryDate,
          executorFee: parsedLog.values.executorFee
        };
      }
    });
  } catch (err) {
    debug(err);
  }

  // LogTriggerActionMinted
  let topicTAMinted = ethers.utils.id(
    "LogTriggerActionMinted(uint256,address,bytes,address)"
  );
  let filterTAMinted = {
    address: gelatoCoreAddress,
    fromBlock: parseInt(searchFromBlock),
    topics: [topicTAMinted]
  };
  try {
    const logsTAMinted = await provider.getLogs(filterTAMinted);
    logsTAMinted.forEach(log => {
      if (log !== undefined) {
        const parsedLog = iface.parseLog(log);
        const executionClaimId = parsedLog.values.executionClaimId.toString();
        debug(
          `\t\tLogTriggerActionMinted:\n\t\texecutionClaimId: ${executionClaimId}\n`
        );
        mintedClaims[executionClaimId].trigger = parsedLog.values.trigger;
        mintedClaims[executionClaimId].triggerPayload =
          parsedLog.values.triggerPayload;
        mintedClaims[executionClaimId].action = parsedLog.values.action;
      }
    });
  } catch (err) {
    debug(err);
  }

  // LogClaimExecutedAndDeleted
  let topicDeleted = ethers.utils.id(
    "LogClaimExecutedAndDeleted(uint256,address,address,uint256,uint256,uint256,uint256)"
  );
  let filterDeleted = {
    address: gelatoCoreAddress,
    fromBlock: parseInt(searchFromBlock),
    topics: [topicDeleted]
  };
  try {
    const logsDeleted = await provider.getLogs(filterDeleted);
    logsDeleted.forEach(log => {
      if (log !== undefined) {
        const parsedLog = iface.parseLog(log);
        const executionClaimId = parsedLog.values.executionClaimId.toString();
        if (mintedClaims[executionClaimId] !== undefined) {
          for (let key of Object.keys(mintedClaims[executionClaimId])) {
            delete mintedClaims[executionClaimId][key];
          }
          delete mintedClaims[executionClaimId];
          debug(`\n\t\t LogClaimExecutedAndDeleted: ${executionClaimId}`);
        }
      }
    });
  } catch (err) {
    debug(err);
  }

  // LogExecutionClaimCancelled
  let topicCancelled = ethers.utils.id(
    "LogExecutionClaimCancelled(uint256,address,address)"
  );
  let filterCancelled = {
    address: gelatoCoreAddress,
    fromBlock: parseInt(searchFromBlock),
    topics: [topicCancelled]
  };
  try {
    const logsCancelled = await provider.getLogs(filterCancelled);
    logsCancelled.forEach(log => {
      if (log !== undefined) {
        const parsedLog = iface.parseLog(log);
        const executionClaimId = parsedLog.values.executionClaimId.toString();
        if (mintedClaims[executionClaimId] !== undefined) {
          for (let key of Object.keys(mintedClaims[executionClaimId])) {
            delete mintedClaims[executionClaimId][key];
          }
          delete mintedClaims[executionClaimId];
          debug(`\n\t\t LogExecutionClaimCancelled: ${executionClaimId}`);
        }
      }
    });
  } catch (err) {
    debug(err);
  }

  // Log available executionClaims
  if (Object.values(mintedClaims).length === 0) {
    debug("\n\n\t\t Available ExecutionClaims: NONE");
  } else {
    for (let executionClaimId in mintedClaims) {
      if (executionClaimId.trigger !== undefined) {
        debug("\n\n\t\t Available ExecutionClaims:");
        for (let [key, value] of Object.entries(
          mintedClaims[executionClaimId]
        )) {
          debug(`\t\t${key}: ${value}`);
        }
        debug("\n");
      }
    }
  }

  // Loop through all execution claims and check if they are executable.
  //  If yes, execute, if not, skip
  let canExecuteReturn;
  const canExecuteResults = [
    "WrongCalldataOrAlreadyDeleted",
    "NonExistantExecutionClaim",
    "ExecutionClaimExpired",
    "TriggerReverted",
    "NotExecutable",
    "Executable"
  ];
  for (let executionClaimId in mintedClaims) {
    // Proceed only if executionClaimId not currently undergoing execution
    if (beingExecuted[executionClaimId] === true) {
      debug(
        `\t\t ❗❗ Skipping ID ${executionClaimId} as already being executed ❗❗`
      );
      continue;
    }
    // Proceed only if executionClaimId not currently undergoing execution
    if (blacklist[executionClaimId] === true) {
      debug(
        `\t\t ❗❗Skipping ID ${executionClaimId} as it is BLACKLISTED (3 failed attempts)❗❗`
      );
      continue;
    }
    // Call canExecute
    try {
      canExecuteReturn = await gelatoCoreContract.canExecute(
        mintedClaims[executionClaimId].trigger,
        mintedClaims[executionClaimId].triggerPayload,
        mintedClaims[executionClaimId].userProxy,
        mintedClaims[executionClaimId].actionPayload,
        mintedClaims[executionClaimId].executeGas,
        mintedClaims[executionClaimId].executionClaimId,
        mintedClaims[executionClaimId].executionClaimExpiryDate,
        mintedClaims[executionClaimId].executorFee
      );
      debug(
        `\n\t\t CanExecute Result for ${executionClaimId}: ${
          canExecuteResults[parseInt(canExecuteReturn)]
        }`
      );
    } catch (err) {
      debug(err);
    }
    if (canExecuteResults[parseInt(canExecuteReturn)] === "Executable") {
      debug(`
            🔥🔥🔥ExeutionClaim: ${executionClaimId} is executable🔥🔥🔥
          `);
      let tx;
      try {
        debug(`\t\t⚡⚡⚡ Send TX ⚡⚡⚡\n`);
        beingExecuted[executionClaimId] = true;
        tx = await gelatoCoreContract.execute(
          mintedClaims[executionClaimId].trigger,
          mintedClaims[executionClaimId].triggerPayload,
          mintedClaims[executionClaimId].userProxy,
          mintedClaims[executionClaimId].actionPayload,
          mintedClaims[executionClaimId].action,
          mintedClaims[executionClaimId].executeGas,
          mintedClaims[executionClaimId].executionClaimId,
          mintedClaims[executionClaimId].executionClaimExpiryDate,
          mintedClaims[executionClaimId].executorFee,
          {
            gasLimit: 5000000
          }
        );
        debug(`\t\t gelatoCore.execute() txHash:\n \t${tx.hash}\n`);
        // The operation is NOT complete yet; we must wait until it is mined
        debug("\t\t waiting for the execute transaction to get mined \n");
        txreceipt = await tx.wait();
        beingExecuted[executionClaimId] = false;
        debug("\t\t Execute TX Receipt:\n", txreceipt);
      } catch (err) {
        debug(err);
        beingExecuted[executionClaimId] = false;
        if (failedExecuteAttempts[executionClaimId] === undefined) {
          failedExecuteAttempts[executionClaimId] = 1;
          debug(
            `\n\t\t ❗❗ FAILED EXECUTE ATTEMPT RECORDED FOR ID ${executionClaimId}: ${failedExecuteAttempts[executionClaimId]}/3 allowed attempts ❗❗ `
          );
          continue;
        }
        failedExecuteAttempts[executionClaimId]++;
        debug(
          `\n\t\t❗❗FAILED EXECUTE ATTEMPT RECORDED FOR ID ${executionClaimId}: ${failedExecuteAttempts[executionClaimId]}/3 allowed attempts ❗❗`
        );
        if (failedExecuteAttempts[executionClaimId] === 3) {
          debug(
            `\n\t\t ❗❗ 3 ATTEMPTS FOR ID ${executionClaimId} FAILED -> BLACKLISTED ❗❗`
          );
          blacklist[executionClaimId] = true;
          continue;
        }
      }
    } else {
      debug(
        `\t\t❌❌❌ ExeutionClaim: ${executionClaimId} is NOT executable ❌❌❌`
      );
    }
  }
  // Reset the searchFromBlock
  searchFromBlock = currentBlock - 8;
  debug(
    `\n\n\t\t Current Block: ${currentBlock}\n\t\t Next search from block: ${searchFromBlock}`
  );
}
