// Javascript Ethereum API Library
const ethers = require("ethers");

// Helpers
const sleep = require("../helpers/sleep.js").sleep;

// ENV VARIABLES
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const DEV_MNEMONIC = process.env.DEV_MNEMONIC;
const INFURA_ID = process.env.INFURA_ID;
console.log(
  `\n\t\t env variables configured: ${DEV_MNEMONIC !== undefined &&
    INFURA_ID !== undefined}`
);

// Contract Addresses
let gelatoCoreAddress;

// Setting up Provider and getting network-specific variables
let provider;

if (process.env.ROPSTEN) {
  console.log(`\n\t\t ✅ connected to ROPSTEN ✅ \n`);
  provider = new ethers.providers.InfuraProvider("ropsten", INFURA_ID);
  gelatoCoreAddress = process.env.GELATO_CORE_ADDRESS_ROPSTEN;
} else if (process.env.RINKEBY && !process.env.ROPSTEN) {
  console.log(`\n\t\t ✅ connected to RINKEBY ✅ \n`);
  provider = new ethers.providers.InfuraProvider("rinkeby", INFURA_ID);
  gelatoCoreAddress = process.env.GELATO_CORE_ADDRESS_RINKEBY;
} else {
  console.log(`\n\t\t ❗NO NETWORK DEFINED ❗\n`);
}

// Signer (wallet)
const wallet = ethers.Wallet.fromMnemonic(DEV_MNEMONIC);
const connectedWallet = wallet.connect(provider);

const gelatoCoreABI = [
  "function registerExecutor(uint256 _executorPrice, uint256 _executorClaimLifespan) external"
];

const gelatoCore = new ethers.Contract(
  gelatoCoreAddress,
  gelatoCoreABI,
  connectedWallet
);

// Arguments for erc20.contract.approve
const EXECUTOR_PRICE = utils.bigNumberify(5e9); // 10 gwei
const EXECUTOR_CLAIM_LIFESPAN = utils.bigNumberify("8600000"); // 100 days

async function main() {
  try {
    const tx = await gelatoCore.registerExecutor(
      EXECUTOR_PRICE,
      EXECUTOR_CLAIM_LIFESPAN
    );
    console.log(`\n\t\t registerExecutor tx hash:\n\t ${tx.hash}`);
    const txReceipt = await tx.wait();
    console.dir(txReceipt);
  } catch (err) {
    console.error(err);
  }
}

main().catch(err => console.error(err));

exports.main = () => {
  return main();
};
