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

// Setting up Provider and Signer (wallet)
const provider = new ethers.providers.InfuraProvider("ropsten", INFURA_ID);
const wallet = ethers.Wallet.fromMnemonic(DEV_MNEMONIC);
const connectedWallet = wallet.connect(provider);

// Contract Addresses for instantiation
const KYBER_PROXY_ADDRESS = "0x818E6FECD516Ecc3849DAf6845e3EC868087B755";
const GELATO_CORE_ADDRESS = "0x624f09392ae014484a1aB64c6D155A7E2B6998E6";
const USER_PROXY_ADDRESS = "0x386b7F18599a0b392F9e3a22F1475A6129558833";

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

// Read-Write Instance of UserProxy
const userProxyABI = [
  "function execute(address target, bytes data) payable returns(bytes response)"
];
const userProxyContract = new ethers.Contract(
  USER_PROXY_ADDRESS,
  userProxyABI,
  connectedWallet
);

// Arguments for userProxy.execute(address target, bytes memory data)
const MULTI_MINT_IMPL_ADDRESS = "0xD10b3f4b06439b2b8B2D9788b6A5278d6055B19B";
const TARGET_ADDRESS = MULTI_MINT_IMPL_ADDRESS;

// Arguments for function call to multiMintProxy.multiMint()
const TRIGGER_TIME_PROXY_ADDRESS = "0x8ef28734d54d63A50a7D7F37A4523f9af5ca2B19";
const START_TIME = Math.floor(Date.now() / 1000);
const ACTION_KYBER_IMPL_ADDRESS = "0xD31D01544Ab158a4370D38B2E9b0d3390E928A2b";
// Specific Action Params: encoded during main() execution
const USER = "0x203AdbbA2402a36C202F207caA8ce81f1A4c7a72";
const SRC = "0x4E470dc7321E84CA96FcAEDD0C8aBCebbAEB68C6"; // ropsten knc
const DEST = "0xaD6D458402F60fD3Bd25163575031ACDce07538D"; // ropsten dai
const SRC_AMOUNT = ethers.utils.parseUnits("10", 18);
// minConversionRate async fetched from KyberNetwork during main() execution
const SELECTED_EXECUTOR_ADDRESS = "0x203AdbbA2402a36C202F207caA8ce81f1A4c7a72";
const INTERVAL_SPAN = "120"; // 300 seconds
const NUMBER_OF_MINTS = "2";

// ABI encoding function
const getActionKyberTradePayloadWithSelector = require("../helpers/encodings.js")
  .getActionKyberTradePayloadWithSelector;
const getMultiMintForTimeTriggerPayloadWithSelector = require("../helpers/encodings.js")
  .getMultiMintForTimeTriggerPayloadWithSelector;

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
    `\n\t\t minConversionRate: ${ethers.utils.formatUnits(
      minConversionRate,
      18
    )}\n`
  );

  // Encode the specific params for ActionKyberTrade
  const ACTION_KYBER_PAYLOAD = getActionKyberTradePayloadWithSelector(
    SRC,
    SRC_AMOUNT,
    DEST,
    USER,
    minConversionRate
  );
  console.log(`\t\t EncodedActionParams: \n ${ACTION_KYBER_PAYLOAD}\n`);

  // Encode the payload for the call to MultiMintForTimeTrigger.multiMint
  const MULTI_MINT_PAYLOAD_WITH_SELECTOR = getMultiMintForTimeTriggerPayloadWithSelector(
    TRIGGER_TIME_PROXY_ADDRESS,
    START_TIME.toString(),
    ACTION_KYBER_IMPL_ADDRESS,
    ACTION_KYBER_PAYLOAD,
    SELECTED_EXECUTOR_ADDRESS,
    INTERVAL_SPAN,
    NUMBER_OF_MINTS
  );
  console.log(
    `\t\t Encoded Payload With Selector for multiMint:\n ${MULTI_MINT_PAYLOAD_WITH_SELECTOR}\n`
  );

  // Getting the current Ethereum price
  let etherscanProvider = new ethers.providers.EtherscanProvider();
  let ethUSDPrice;
  etherscanProvider.getEtherPrice().then(price => {
    console.log(`\n\t\t Ether price in USD: ${price}`);
    ethUSDPrice = price;
  });
  const MINTING_DEPOSIT_PER_MINT = await gelatoCoreContract.getMintingDepositPayable(
    ACTION_KYBER_IMPL_ADDRESS,
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
