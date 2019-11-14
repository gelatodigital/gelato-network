// Javascript Ethereum API Library
const ethers = require("ethers");

// Helpers
const sleep = require("../../helpers/sleep.js").sleep;

// ENV VARIABLES
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });
const DEV_MNEMONIC = process.env.DEV_MNEMONIC;
const INFURA_ID = process.env.INFURA_ID;
console.log(
  `\n\t\t env variables configured: ${DEV_MNEMONIC !== undefined &&
    INFURA_ID !== undefined}`
);

// Contract Addresses
let multiMintImplAddress;
let triggerTimestampPassedAddress;
let actionKyberTradeImplAddress;
let src;
let dest;

// Contract Addresses for instantiation
let gelatoCoreAddress;
let kyberProxyAddress;
let userProxyAddress;

// Setting up Provider and getting network-specific variables
let provider;

if (process.env.ROPSTEN) {
  console.log(`\n\t\t ✅ connected to ROPSTEN ✅ \n`);
  provider = new ethers.providers.InfuraProvider("ropsten", INFURA_ID);
  gelatoCoreAddress = "0x84Ea81AD0EF5Aa3c6Aa051c76B5af6E946F88C4E";
  kyberProxyAddress = "0x818E6FECD516Ecc3849DAf6845e3EC868087B755";
  userProxyAddress = "0x64039D999ad572Bc574Cc1F3b36B7a4671C8c538";
  multiMintImplAddress = "0x4Bf21584Cf8E362B16dd9a0DF94f896712986658";
  triggerTimestampPassedAddress = "0x6B54F08968a9dc7959df88d202b99876c2E496eb";
  actionKyberTradeImplAddress = "0x8ce40023B1b12fC5DCEca111A336B8D07542e8F1";
  src = "0x4E470dc7321E84CA96FcAEDD0C8aBCebbAEB68C6"; // Ropsten KNC
  dest = "0xaD6D458402F60fD3Bd25163575031ACDce07538D"; // Ropsten DAI
} else if (process.env.RINKEBY && !process.env.ROPSTEN) {
  console.log(`\n\t\t ✅ connected to RINKEBY ✅ \n`);
  provider = new ethers.providers.InfuraProvider("rinkeby", INFURA_ID);
} else {
  console.log(`\n\t\t ❗NO NETWORK DEFINED ❗\n`);
}
console.log(
  `\n\t\t Current block number: ${provider
    .getBlockNumber()
    .then(blockNumber => {
      console.log(blockNumber);
    })}`
);

// Signer (wallet)
const wallet = ethers.Wallet.fromMnemonic(DEV_MNEMONIC);
const connectedWallet = wallet.connect(provider);

// Read Instance of KyberContract
const kyberABI = [
  "function getExpectedRate(address src, address dest, uint srcQty) view returns(uint,uint)"
];
const kyberContract = new ethers.Contract(
  kyberProxyAddress,
  kyberABI,
  provider
);

// ReadInstance of GelatoCore
const gelatoCoreABI = [
  "function getMintingDepositPayable(address _action, address _selectedExecutor) view returns(uint)"
];
const gelatoCoreContract = new ethers.Contract(
  gelatoCoreAddress,
  gelatoCoreABI,
  provider
);

// Read-Write Instance of UserProxy
const userProxyABI = [
  "function execute(address target, bytes data) payable returns(bytes response)"
];
const userProxyContract = new ethers.Contract(
  userProxyAddress,
  userProxyABI,
  connectedWallet
);

// Arguments for userProxy.execute(address target, bytes memory data)
const TARGET_ADDRESS = multiMintImplAddress;

// Arguments for function call to multiMintProxy.multiMint()
const START_TIME = Math.floor(Date.now() / 1000);
// Specific Action Params: encoded during main() execution
const USER = "0x203AdbbA2402a36C202F207caA8ce81f1A4c7a72";
const SRC_AMOUNT = ethers.utils.parseUnits("1", 18);
// minConversionRate async fetched from KyberNetwork during main() execution
const SELECTED_EXECUTOR_ADDRESS = "0x203AdbbA2402a36C202F207caA8ce81f1A4c7a72";
const INTERVAL_SPAN = "120"; // 300 seconds
const NUMBER_OF_MINTS = "2";

// ABI encoding function
const getActionKyberTradePayloadWithSelector = require("./kyber_encoders/actionKyberTradeEncoder.js")
  .getActionKyberTradePayloadWithSelector;
const getMultiMintForTimeTriggerPayloadWithSelector = require("../multi_mint/time_trigger/multiMintTimeTriggerEncoder.js")
  .getMultiMintForTimeTriggerPayloadWithSelector;

// The execution logic
async function main() {
  // Fetch the slippage rate from KyberNetwork and assign it to minConversionRate
  let minConversionRate;
  [_, minConversionRate] = await kyberContract.getExpectedRate(
    src,
    dest,
    SRC_AMOUNT
  );
  console.log(
    `\n\t\t minConversionRate: ${ethers.utils.formatUnits(
      minConversionRate,
      18
    )}\n`
  );

  // Encode the specific params for ActionKyberTrade
  const ACTION_KYBER_PAYLOAD_WITH_SELECTOR = getActionKyberTradePayloadWithSelector(
    src,
    SRC_AMOUNT,
    dest,
    USER,
    minConversionRate
  );
  console.log(
    `\t\t EncodedActionParams: \n ${ACTION_KYBER_PAYLOAD_WITH_SELECTOR}\n`
  );

  // Encode the payload for the call to MultiMintForTimeTrigger.multiMint
  const MULTI_MINT_PAYLOAD_WITH_SELECTOR = getMultiMintForTimeTriggerPayloadWithSelector(
    triggerTimestampPassedAddress,
    START_TIME.toString(),
    actionKyberTradeImplAddress,
    ACTION_KYBER_PAYLOAD_WITH_SELECTOR,
    SELECTED_EXECUTOR_ADDRESS,
    INTERVAL_SPAN,
    NUMBER_OF_MINTS
  );
  console.log(
    `\t\t Encoded Payload With Selector for multiMint:\n ${MULTI_MINT_PAYLOAD_WITH_SELECTOR}\n`
  );

  // Getting the current Ethereum price
  let etherscanProvider = new ethers.providers.EtherscanProvider();
  let ethUSDPrice = await etherscanProvider.getEtherPrice();
  console.log(`\n\t\t Ether price in USD: ${ethUSDPrice}`);

  const MINTING_DEPOSIT_PER_MINT = await gelatoCoreContract.getMintingDepositPayable(
    actionKyberTradeImplAddress,
    SELECTED_EXECUTOR_ADDRESS
  );
  console.log(
    `\n\t\t Minting Deposit Per Mint: ${ethers.utils.formatUnits(
      MINTING_DEPOSIT_PER_MINT,
      "ether"
    )} ETH \t\t${ethUSDPrice *
      parseFloat(
        ethers.utils.formatUnits(MINTING_DEPOSIT_PER_MINT, "ether")
      )} $`
  );
  const MSG_VALUE = MINTING_DEPOSIT_PER_MINT.mul(NUMBER_OF_MINTS);
  console.log(
    `\n\t\t Minting Deposit for ${NUMBER_OF_MINTS} mints: ${ethers.utils.formatUnits(
      MSG_VALUE,
      "ether"
    )} ETH \t ${ethUSDPrice *
      parseFloat(ethers.utils.formatUnits(MSG_VALUE, "ether"))} $`
  );

  // send tx to PAYABLE contract method
  let tx;
  try {
    tx = await userProxyContract.execute(
      TARGET_ADDRESS,
      MULTI_MINT_PAYLOAD_WITH_SELECTOR,
      {
        value: MSG_VALUE,
        gasLimit: 2000000
      }
    );
  } catch (err) {
    console.log(err);
  }
  console.log(
    `\n\t\t userProxy.execute(multiMintForTimeTrigger) txHash:\n \t${tx.hash}`
  );

  // The operation is NOT complete yet; we must wait until it is mined
  console.log("\n\t\t waiting for transaction to get mined \n");
  let txReceipt;
  try {
    txReceipt = await tx.wait();
  } catch (err) {
    console.log(err);
  }
  console.log(`\n\t\t minting tx mined in block ${txReceipt.blockNumber}`);
}

// What to execute when running node
main().catch(err => console.log(err));
