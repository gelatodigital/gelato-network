// Javascript Ethereum API Library
const ethers = require("ethers");

// Helpers
const sleep = require("../../helpers/sleep.js").sleep;

// ENV VARIABLES for exec-console.log (heroku local default fetches from .env)
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });
const DEV_MNEMONIC = process.env.DEV_MNEMONIC;
const INFURA_ID = process.env.INFURA_ID;
console.log(
  `\n\t\t env variables configured: ${DEV_MNEMONIC !== undefined &&
    INFURA_ID !== undefined}`
);

// Contract Addresses for instantiation
let gelatoCoreAddress;

// Setting up Provider and Signer (wallet)
let provider;
// The block from which we start
let searchFromBlock;
if (process.env.ROPSTEN) {
  console.log(`\n\t\t ✅ connected to ROPSTEN ✅ \n`);
  provider = new ethers.providers.InfuraProvider("ropsten", INFURA_ID);
  searchFromBlock = process.env.ROPSTEN_BLOCK;
  gelatoCoreAddress = "0x624f09392ae014484a1aB64c6D155A7E2B6998E6";
} else if (process.env.RINKEBY) {
  console.log(`\n\t\t ✅ connected to RINKEBY ✅ \n`);
  provider = new ethers.providers.InfuraProvider("rinkeby", INFURA_ID);
  searchFromBlock = process.env.RINKEBY_BLOCK;
  gelatoCoreAddress = "0x0e7dDacA829CD452FF341CF81aC6Ae4f0D2328A7";
} else {
  console.log(`\n\t\t ❗NO NETWORK DEFINED ❗\n`);
}

console.log(`\n\t\t Starting from block number: ${searchFromBlock}`);
if (searchFromBlock === "" || searchFromBlock === undefined) {
  throw new Error("You must have a block number set in your env;'");
}

// Read Instance of GelatoCore
const gelatoCoreContractABI = [
  "event LogNewExecutionClaimMinted(address indexed selectedExecutor, uint256 indexed executionClaimId, address indexed userProxy, bytes actionPayload, uint256 executeGas, uint256 executionClaimExpiryDate, uint256 mintingDeposit)",
  "event LogTriggerActionMinted(uint256 indexed executionClaimId, address indexed trigger, bytes triggerPayload, address indexed action)"
];

async function main() {
  let currentBlock = await provider.getBlockNumber();
  console.log(`\n\t\t Current block number:     ${currentBlock}`);
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
    const logsMinted = await provider.getLogs(filterMinted);
    const logsTAMinted = await provider.getLogs(filterTAMinted);
    const combinedMintingLogs = logsMinted.reduce((acc, log, i) => {
      const parsedMintedLog = iface.parseLog(log);
      if (!acc[i]) {
        acc[i] = [];
      }
      acc[i] = {
        selectedExecutor: parsedMintedLog.values.selectedExecutor,
        executionClaimId: parsedMintedLog.values.executionClaimId,
        userProxy: parsedMintedLog.values.userProxy,
        actionPayload: parsedMintedLog.values.actionPayload,
        executeGas: parsedMintedLog.values.executeGas,
        executionClaimExpiryDate:
          parsedMintedLog.values.executionClaimExpiryDate,
        mintingDeposit: parsedMintedLog.values.mintingDeposit
      };
      const parsedTAMintedLog = iface.parseLog(logsTAMinted[i]);
      acc[i].trigger = parsedTAMintedLog.values.trigger;
      acc[i].triggerPayload = parsedTAMintedLog.values.triggerPayload;
      acc[i].action = parsedTAMintedLog.values.action;
      return acc;
    }, []);

    // Log combined return values of LogNewExecutionClaimMinted and LogTriggerActionMinted
    if (Object.keys(combinedMintingLogs).length === 0) {
      console.log("\n\n\t\t Minting Logs: NONE");
    } else {
      for (let obj of combinedMintingLogs) {
        for (let [key, value] of Object.entries(obj)) {
          console.log(`${key}: ${value}`);
        }
        console.log("\n");
      }
      //console.dir(combinedMintingLogs);
    }
  } catch (err) {
    console.log(err);
  }
}

main().catch(err => console.error(err));
