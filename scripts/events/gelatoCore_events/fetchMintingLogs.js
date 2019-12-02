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
  gelatoCoreAddress = process.env.GELATO_CORE_ADDRESS_ROPSTEN;
} else {
  console.log(`\n\t\t ❗NO NETWORK DEFINED ❗\n`);
}

console.log(`\n\t\t Starting from block number: ${searchFromBlock}`);
if (searchFromBlock === "" || searchFromBlock === undefined) {
  throw new Error("You must have a block number set in your env;'");
}

// Read Instance of GelatoCore
const gelatoCoreContractABI = [
  "event LogNewExecutionClaimMinted(address indexed selectedExecutor, uint256 indexed executionClaimId, address indexed userProxy, address trigger, bytes triggerPayloadWithSelector, address action, bytes actionPayloadWithSelector, uint256 executeGas, uint256 executionClaimExpiryDate, uint256 mintingDeposit)"
];

async function main() {
  let currentBlock = await provider.getBlockNumber();
  console.log(`\n\t\t Current block number:     ${currentBlock}`);
  // Log Parsing
  let iface = new ethers.utils.Interface(gelatoCoreContractABI);

  // LogNewExecutionClaimMinted
  let topicExecutionClaimMinted = ethers.utils.id(
    "LogExecutionClaimMinted(address,uint256,address,address,bytes,address,bytes,uint256,uint256,uint256)"
  );
  let filterExecutionClaimMinted = {
    address: gelatoCoreAddress,
    fromBlock: parseInt(searchFromBlock),
    topics: [topicExecutionClaimMinted]
  };
  try {
    const logsExecutionClaimMinted = await provider.getLogs(
      filterExecutionClaimMinted
    );
    const executionClaimsMinted = logsExecutionClaimMinted.reduce(
      (acc, log, i) => {
        const parsedLog = iface.parseLog(log);
        if (!acc[i]) {
          acc[i] = [];
        }
        acc[i] = {
          selectedExecutor: parsedLog.values.selectedExecutor,
          executionClaimId: parsedLog.values.executionClaimId,
          userProxy: parsedLog.values.userProxy,
          trigger: parsedLog.values.trigger,
          triggerPayloadWithSelector:
            parsedLog.values.triggerPayloadWithSelector,
          action: parsedLog.values.action,
          actionPayloadWithSelector: parsedLog.values.actionPayloadWithSelector,
          executeGas: parsedLog.values.executeGas,
          executionClaimExpiryDate: parsedLog.values.executionClaimExpiryDate,
          mintingDeposit: parsedLog.values.mintingDeposit
        };
        return acc;
      },
      []
    );

    // Log The Event Values
    if (executionClaimsMinted.length === 0) {
      console.log("\n\n\t\t Minting Logs: NONE");
    } else {
      for (let obj of executionClaimsMinted) {
        for (let [key, value] of Object.entries(obj)) {
          console.dir(`${key}: ${value}`);
        }
        console.log("\n");
      }
    }
  } catch (err) {
    console.log(err);
  }
}

main().catch(err => console.error(err));
