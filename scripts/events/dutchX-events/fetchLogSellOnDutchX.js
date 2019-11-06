// Javascript Ethereum API Library
const ethers = require("ethers");

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
let userProxyAddress;

// Setting up Provider and Signer (wallet)
let provider;
if (process.env.ROPSTEN) {
  provider = new ethers.providers.InfuraProvider("ropsten", INFURA_ID);
  //userProxyAddress = "0x624f09392ae014484a1aB64c6D155A7E2B6998E6";
  console.log(`\n\t\t ✅ connected to ROPSTEN ✅ \n`);
} else if (process.env.RINKEBY) {
  provider = new ethers.providers.InfuraProvider("rinkeby", INFURA_ID);
  userProxyAddress = "0x2cBe8EB80604B37d723C7a6A9f971c62F2E202b1";
  console.log(`\n\t\t ✅ connected to RINKEBY ✅ \n`);
} else {
  console.log(`\n\t\t ❗NO NETWORK DEFINED ❗\n`);
}

const wallet = ethers.Wallet.fromMnemonic(DEV_MNEMONIC);
const connectedWallet = wallet.connect(provider);

// Helpers
const sleep = require("../../helpers/sleep.js").sleep;

// The block from which we start
let searchFromBlock = process.env.BLOCK;
console.log(`\n\t\t Starting from block number: ${searchFromBlock}`);
if (searchFromBlock === "") {
  throw new Error("You must call this script with 'export BLOCK=NUMBER;'");
}

// Store the fetched events values here
let sellOnDutchXLogs = {};

async function fetchLogSellOnDutchX() {
  // LogNewExecutionClaimMinted
  const gelatoDutchXInterfaceABI = [
    "event LogSellOnDutchX(uint256 indexed executionClaimId, address indexed dutchXSeller, address indexed sellToken, address buyToken, address user, uint256 sellAmount, uint256 dutchXFee, uint256 sellAmountAfterFee, uint256 sellAuctionIndex)"
  ];

  // Log Parsing
  let iface = new ethers.utils.Interface(gelatoDutchXInterfaceABI);

  let topicSellOnDutchX = ethers.utils.id(
    "LogSellOnDutchX(uint256,address,address,address,address,uint256,uint256,uint256,uint256)"
  );
  let filterSellOnDutchX = {
    address: userProxyAddress,
    fromBlock: parseInt(searchFromBlock),
    topics: [topicSellOnDutchX]
  };
  try {
    const logsSellOnDutchX = await provider.getLogs(filterSellOnDutchX);
    logsSellOnDutchX.forEach(log => {
      if (log !== null) {
        const parsedLog = iface.parseLog(log);
        const executionClaimId = parsedLog.values.executionClaimId.toString();
        console.log(
          `\t\LogSellOnDutchX:\n\t\texecutionClaimId: ${executionClaimId}\n`
        );
        sellOnDutchXLogs[executionClaimId] = {
          executionClaimId: executionClaimId,
          dutchXSeller: parsedLog.values.dutchXSeller,
          sellToken: parsedLog.values.sellToken,
          buyToken: parsedLog.values.buyToken,
          user: parsedLog.values.user,
          sellAmount: parsedLog.values.sellAmount,
          dutchXFee: parsedLog.values.dutchXFee,
          sellAmountAfterFee: parsedLog.values.sellAmountAfterFee,
          sellAuctionIndex: parsedLog.values.sellAuctionIndex
        };
      }
    });
  } catch (err) {
    console.log(err);
  }
  // Log available executionClaims
  if (Object.values(sellOnDutchXLogs).length === 0) {
    console.log("\n\n\t\t LogSellOnDutchX: NONE");
  } else {
    console.log(sellOnDutchXLogs);
    await sleep(10000000);
    for (let executionClaimId in sellOnDutchXLogs) {
      if (executionClaimId.dutchXSeller !== undefined) {
        console.log(
          `\n\n\t\t LogSellOnDutchX for executionClaimId ${executionClaimId}\n`
        );
        for (let [key, value] of Object.entries(
          sellOnDutchXLogs[executionClaimId]
        )) {
          console.log(`\t\t${key}: ${value}`);
        }
        console.log("\n");
      }
    }
  }
}

fetchLogSellOnDutchX().catch(err => console.error(err));
