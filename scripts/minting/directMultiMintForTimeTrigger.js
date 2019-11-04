// Javascript Ethereum API Library
const ethers = require("ethers");

// Helpers
const sleep = require("../helpers/sleep.js").sleep;

// Fetch env variables
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const DEV_MNEMONIC = process.env.DEV_MNEMONIC;
const INFURA_ID = process.env.INFURA_ID;
console.log(
  `\n\t env variables configured: ${assert.ok(DEV_MNEMONIC) &&
    assert.ok(INFURA_ID)}`
);

// Setting up Provider and Signer (wallet)
const provider = new ethers.providers.InfuraProvider("ropsten", INFURA_ID);
const wallet = ethers.Wallet.fromMnemonic(DEV_MNEMONIC);
const connectedWallet = wallet.connect(provider);

// Read-Write Instance of MultiMintContract
const multiMintABI = require("../../build/contracts/MultiMintForTimeTrigger.json")
  .abi;
const multiMintContract = new ethers.Contract(
  MULTI_MINT_PROXY_ADDRESS,
  multiMintABI,
  connectedWallet
);

// Read Instance of KyberContract
const kyberABI = [
  "function getExpectedRate(address SRC, address DEST, uint srcQty) view returns(uint,uint)"
];
const kyberContract = new ethers.Contract(
  KYBER_PROXY_ADDRESS,
  kyberABI,
  provider
);

// ReadInstance of GelatoCore
const gelatoCoreABI = [
  "function getMintingDepositPayable(address _action, address _selectedExecutor) view returns(uint)"
];
const gelatoCoreContract = new ethers.Contract(
  GELATO_CORE_ADDRESS,
  gelatoCoreABI,
  provider
);

// Contract Addresses for instantiation
const MULTI_MINT_PROXY_ADDRESS = "0x22ef77200f1e98eee9545659f31376acd718f7af";
const KYBER_PROXY_ADDRESS = "0x818E6FECD516Ecc3849DAf6845e3EC868087B755";
const GELATO_CORE_ADDRESS = "0x624f09392ae014484a1aB64c6D155A7E2B6998E6";

// Arguments for function call to multiMintProxy.multiMint()
const TRIGGER_TIME_PROXY_ADDRESS = "0x8ef28734d54d63A50a7D7F37A4523f9af5ca2B19";
const START_TIME = Date.now();
const ACTION_KYBER_PROXY_ADDRESS = "0x8710aF1bC86a569c18Ec5b41A656B3aA9Eca9037";
// Specific Action Params: encoded during main() execution
const SRC = "0x4E470dc7321E84CA96FcAEDD0C8aBCebbAEB68C6"; // ropsten knc
const DEST = "0xaD6D458402F60fD3Bd25163575031ACDce07538D"; // ropsten dai
const SRC_AMOUNT = ethers.utils.bigNumberify((10e18).toString());
// minConversionRate async fetched from KyberNetwork during main() execution
const SELECTED_EXECUTOR_ADDRESS = "0x203AdbbA2402a36C202F207caA8ce81f1A4c7a72";
const INTERVAL_SPAN = "300"; // 300 seconds
const NUMBER_OF_MINTS = "3";

// ABI encoding function
const getEncodedActionKyberTradeParams = require("../helpers/encodings.js")
  .getEncodedActionKyberTradeParams;

// The execution logic
async function main() {
  // Fetch the slippage rate from KyberNetwork and assign it to minConversionRate
  let minConversionRate;
  [_, minConversionRate] = await kyberContract.getExpectedRate(
    SRC,
    DEST,
    SRC_AMOUNT
  );
  console.log(
    `\n\t minConversionRate: ${ethers.utils.formatUnits(
      minConversionRate,
      18
    )}\n`
  );

  // Encode the specific params for ActionKyberTrade
  const ENCODED_ACTION_PARAMS = getEncodedActionKyberTradeParams(
    SRC,
    DEST,
    SRC_AMOUNT,
    minConversionRate
  );
  console.log(`\t EncodedActionParams: ${ENCODED_ACTION_PARAMS}\n`);

  const MINTING_DEPOSIT_PER_MINT = await gelatoCoreContract.getMintingDepositPayable(
    ACTION_KYBER_PROXY_ADDRESS,
    SELECTED_EXECUTOR_ADDRESS
  );
  console.log(
    `\n\t\t Minting Deposit Per Mint: ${ethers.utils.formatUnits(
      MINTING_DEPOSIT_PER_MINT,
      "ether"
    )} ETH`
  );
  const MSG_VALUE = MINTING_DEPOSIT_PER_MINT.mul(NUMBER_OF_MINTS);
  console.log(
    `\n\t\t Minting Deposit for ${NUMBER_OF_MINTS} mints: ${ethers.utils.formatUnits(
      MSG_VALUE,
      "ether"
    )} ETH \n`
  );

  // send tx to PAYABLE contract method
  let tx = await multiMintContract.multiMint(
    TRIGGER_TIME_PROXY_ADDRESS,
    START_TIME,
    ACTION_KYBER_PROXY_ADDRESS,
    ENCODED_ACTION_PARAMS,
    SELECTED_EXECUTOR_ADDRESS,
    INTERVAL_SPAN,
    NUMBER_OF_MINTS,
    { value: MSG_VALUE, gasLimit: 2000000 }
  );

  console.log(`\tmultiMint txHash: ${tx.hash}`);

  // The operation is NOT complete yet; we must wait until it is mined
  console.log("\t\n waiting for transaction to get mined \n");
  await tx.wait();
}

// What to execute when running node
main().catch(err => console.log(err));
