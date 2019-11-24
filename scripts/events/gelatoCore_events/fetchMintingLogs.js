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
  gelatoCoreAddress = "0x84Ea81AD0EF5Aa3c6Aa051c76B5af6E946F88C4E";
} else if (process.env.RINKEBY && !process.env.ROPSTEN) {
  console.log(`\n\t\t ✅ connected to RINKEBY ✅ \n`);
  provider = new ethers.providers.InfuraProvider("rinkeby", INFURA_ID);
  searchFromBlock = process.env.RINKEBY_BLOCK;
  gelatoCoreAddress = "0x501aF774Eb578203CC34E7171273124A93706C06";
} else {
  console.log(`\n\t\t ❗NO NETWORK DEFINED OR RINKEBY-v-ROPSTEN-clash❗\n`);
}

console.log(`\n\t\t Starting from block number: ${searchFromBlock}`);
if (searchFromBlock === "" || searchFromBlock === undefined) {
  throw new Error("You must have a block number set in your env;'");
}

// Read Instance of GelatoCore
const gelatoCoreContractABI = [
  "event LogNewExecutionClaimMinted(address indexed selectedExecutor, uint256 indexed executionClaimId, address indexed userProxy, uint256 executeGas, uint256 executionClaimExpiryDate, uint256 mintingDeposit)",
  "event LogTriggerActionMinted(uint256 indexed executionClaimId, address indexed trigger, bytes triggerPayloadWithSelector, address indexed action, bytes actionPayloadWithSelector)"
];

async function main() {
  let currentBlock = await provider.getBlockNumber();
  console.log(`\n\t\t Current block number:     ${currentBlock}`);
  // Log Parsing
  let iface = new ethers.utils.Interface(gelatoCoreContractABI);

  // LogNewExecutionClaimMinted
  let topicMinted = ethers.utils.id(
    "LogNewExecutionClaimMinted(address,uint256,address,uint256,uint256,uint256)"
  );
  let filterMinted = {
    address: gelatoCoreAddress,
    fromBlock: parseInt(searchFromBlock),
    topics: [topicMinted]
  };
  // LogTriggerActionMinted
  let topicTAMinted = ethers.utils.id(
    "LogTriggerActionMinted(uint256,address,bytes,address,bytes)"
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
        executeGas: parsedMintedLog.values.executeGas,
        executionClaimExpiryDate:
          parsedMintedLog.values.executionClaimExpiryDate,
        mintingDeposit: parsedMintedLog.values.mintingDeposit
      };
      const parsedTAMintedLog = iface.parseLog(logsTAMinted[i]);
      acc[i].trigger = parsedTAMintedLog.values.trigger;
      acc[i].triggerPayloadWithSelector =
        parsedTAMintedLog.values.triggerPayloadWithSelector;
      acc[i].action = parsedTAMintedLog.values.action;
      acc[i].actionPayloadWithSelector =
        parsedTAMintedLog.values.actionPayloadWithSelector;
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
