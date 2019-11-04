// Javascript Ethereum API Library
const ethers = require("ethers");

// Wallet and Provider
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const DEV_MNEMONIC = process.env.DEV_MNEMONIC;
const INFURA_ID = process.env.INFURA_ID;

// Setting up Provider and Signer (wallet)
const provider = new ethers.providers.InfuraProvider("ropsten", INFURA_ID);
const wallet = ethers.Wallet.fromMnemonic(DEV_MNEMONIC);
const connectedWallet = wallet.connect(provider);

//console.log(wallet.address);
const sleep = require("../helpers/sleep.js").sleep;

// Contract Addresses for instantiation
const GELATO_CORE_PROXY_ADDRESS = "0x624f09392ae014484a1aB64c6D155A7E2B6998E6";

// Arguments for function call gelatoCore.setExecutorPrice()
const EXECUTOR_PRICE = ethers.utils.parseUnits("50", "gwei");

// Read-Write Instance of GelatoCore
const gelatoCoreABI = [
  "function setExecutorPrice(uint256 _newExecutorGasPrice)",
  "function getExecutorPrice(address _executor)"
];
const gelatoCoreContract = new ethers.Contract(
  GELATO_CORE_PROXY_ADDRESS,
  gelatoCoreABI,
  connectedWallet
);

// async blockchain call to gelatoCore.setExecutorPrice()
async function main() {
  // send tx to contract method
  const tx = await gelatoCoreContract.setExecutorPrice(EXECUTOR_PRICE);

  console.log(`\t setExecutorPrice txHash: ${tx.hash}`);

  // The operation is NOT complete yet; we must wait until it is mined
  await tx.wait();

  // Fetch the newly set executor price
  const executorPrice = await gelatoCoreContract.getExecutorPrice(
    wallet.address
  );
  console.log(`executorPrice set to: ${executorPrice}`);
}

main().catch(err => console.log(err));
