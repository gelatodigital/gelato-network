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
let userProxyAddress;

// Setting up Provider and Signer (wallet)
let provider;
// The block from which we start
let searchFromBlock;
if (process.env.ROPSTEN) {
  provider = new ethers.providers.InfuraProvider("ropsten", INFURA_ID);
  userProxyAddress = process.env.USER_PROXY;
  console.log(`\n\t\t ✅ connected to ROPSTEN ✅ \n`);
  searchFromBlock = process.env.ROPSTEN_BLOCK;
} else if (process.env.RINKEBY) {
  provider = new ethers.providers.InfuraProvider("rinkeby", INFURA_ID);
  userProxyAddress = process.env.USER_PROXY;
  console.log(`\n\t\t ✅ connected to RINKEBY ✅ \n`);
  searchFromBlock = process.env.RINKEBY_BLOCK;
} else {
  console.log(`\n\t\t ❗NO NETWORK DEFINED ❗\n`);
};

console.log(`\n\t\t Starting from block number: ${searchFromBlock}`);
if (searchFromBlock === "" || searchFromBlock === undefined) {
  throw new Error("You must have a block number set in your env;'");
}

// LogNewExecutionClaimMinted
const gelatoDutchXInterfaceABI = [
  "event LogSellOnDutchX(address indexed user, address indexed dutchXSeller, address indexed sellToken, address buyToken, uint256 sellAmount, uint256 dutchXFee, uint256 sellAmountAfterFee, uint256 sellAuctionIndex)"
];

async function fetchLogSellOnDutchX() {
  // Log Parsing
  let iface = new ethers.utils.Interface(gelatoDutchXInterfaceABI);

  let topicSellOnDutchX = ethers.utils.id(
    "LogSellOnDutchX(address,address,address,address,uint256,uint256,uint256,uint256)"
  );
  let filterSellOnDutchX = {
    address: userProxyAddress,
    fromBlock: parseInt(searchFromBlock),
    topics: [topicSellOnDutchX]
  };
  try {
    const logsSellOnDutchX = await provider.getLogs(filterSellOnDutchX);
    const sellOnDutchXLogs = logsSellOnDutchX.reduce((acc, log, i) => {
      const parsedLog = iface.parseLog(log);
      if (!acc[i]) {
        acc[i] = [];
      }
      acc[i] = {
        user: parsedLog.values.user,
        dutchXSeller: parsedLog.values.dutchXSeller,
        sellToken: parsedLog.values.sellToken,
        buyToken: parsedLog.values.buyToken,
        sellAmount: parsedLog.values.sellAmount,
        dutchXFee: parsedLog.values.dutchXFee,
        sellAmountAfterFee: parsedLog.values.sellAmountAfterFee,
        sellAuctionIndex: parsedLog.values.sellAuctionIndex
      };
      return acc;
    }, []);
    // Log available executionClaims
    if (Object.keys(sellOnDutchXLogs).length === 0) {
      console.log("\n\n\t\t LogSellOnDutchX: NONE");
    } else {
      for (let obj of sellOnDutchXLogs) {
        for (let [key, value] of Object.entries(obj)) {
          console.log(`${key}: ${value.toString()}`);
        }
        console.log("\n");
      }
      //console.dir(sellOnDutchXLogs);
    }
  } catch (err) {
    console.log(err);
  }
}

fetchLogSellOnDutchX().catch(err => console.error(err));
