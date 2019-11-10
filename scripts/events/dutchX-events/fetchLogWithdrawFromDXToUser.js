// Javascript Ethereum API Library
const ethers = require("ethers");

// Helpers
const sleep = require("../../helpers/sleep.js").sleep

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
const actionWithdrawFromDXToUserABI = [
  "event LogWithdrawFromDutchXToUser(address indexed user, address indexed sellToken, address indexed buyToken, uint256 auctionIndex, uint256 withdrawAmount)"
];

async function fetchLogWithdrawFromDXToUser() {
  // Log Parsing
  let iface = new ethers.utils.Interface(actionWithdrawFromDXToUserABI);

  let topicWithdrawFromDXToUser = ethers.utils.id(
    "LogWithdrawFromDutchXToUser(address,address,address,uint256,uint256)"
  );
  let filterWithdrawFromDXToUser = {
    address: userProxyAddress,
    fromBlock: parseInt(searchFromBlock),
    topics: [topicWithdrawFromDXToUser]
  };
  try {
    const logWithdrawFromDXToUser = await provider.getLogs(filterWithdrawFromDXToUser);
    const withdrawFromDXToUserLogs = logWithdrawFromDXToUser.reduce((acc, log, i) => {
      const parsedLog = iface.parseLog(log);
      if (!acc[i]) {
        acc[i] = [];
      }
      acc[i] = {
        user: parsedLog.values.user,
        sellToken: parsedLog.values.sellToken,
        buyToken: parsedLog.values.buyToken,
        auctionIndex: parsedLog.values.auctionIndex,
        withdrawAmount: parsedLog.values.withdrawAmount
      };
      return acc;
    }, []);
    // Log available executionClaims
    if (Object.keys(withdrawFromDXToUserLogs).length === 0) {
      console.log("\n\n\t\t LogWithdrawFromDutchXToUser: NONE");
    } else {
      for (let obj of withdrawFromDXToUserLogs) {
        for (let [key, value] of Object.entries(obj)) {
          console.log(`${key}: ${value.toString()}`);
        }
        console.log("\n");
      }
      //console.dir(withdrawFromDXToUserLogs);
    }
  } catch (err) {
    console.log(err);
  }
}

fetchLogWithdrawFromDXToUser().catch(err => console.error(err));
