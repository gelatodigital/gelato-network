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
let actionMultiMintAddress;
let triggerTimestampPassedAddress;
let actionKyberTradeAddress;
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
  gelatoCoreAddress = "0x3C64f059a17beCe12d5C43515AB67836c5857E26";
  kyberProxyAddress = "0x818E6FECD516Ecc3849DAf6845e3EC868087B755";
  userProxyAddress = "0x9C4A922FF17d7Dd06f678C65Ee4142C8fBD95962";
  actionMultiMintAddress = "0x6d679B6EfE6FBC3BC7FD48b86Cc223305a56b9cF";
  triggerTimestampPassedAddress = "0x173422312A7e5F571BEaa221287A20Ec4Dc712EE";
  actionKyberTradeAddress = "0xAbeB5c311A85d73B2B0357bB3D08b183787591E0";
  src = "0x4E470dc7321E84CA96FcAEDD0C8aBCebbAEB68C6"; // Ropsten KNC
  dest = "0xaD6D458402F60fD3Bd25163575031ACDce07538D"; // Ropsten DAI
} else if (process.env.RINKEBY) {
  console.log(`\n\t\t ✅ connected to RINKEBY ✅ \n`);
  provider = new ethers.providers.InfuraProvider("rinkeby", INFURA_ID);
  gelatoCoreAddress = "0xdDbbbBc9128eE4282d2fe8854763d778fEA551b1";
  kyberProxyAddress = "0xF77eC7Ed5f5B9a5aee4cfa6FFCaC6A4C315BaC76";
  userProxyAddress = "0x331232C54659b057e3142a8d50239d83c3f8F818";
  actionMultiMintAddress = "0x98e7290bDb544482E7B653C0167B0c886Be268f3";
  triggerTimestampPassedAddress = "0x2211Dde1def400085307b1725676eb6bBa68995A";
  actionKyberTradeAddress = "0x6ef7947A18b93D4F0A67BdBc2c6F933b8a0b9257";
  src = "0x6FA355a7b6bD2D6bD8b927C489221BFBb6f1D7B2"; // Rinkeby KNC
  dest = "0x725d648E6ff2B8C44c96eFAEa29b305e5bb1526a"; // Rinkeby MANA
} else if (process.env.ROPSTEN && process.env.RINKEBY) {
  console.error(`\n\t\t ❗ROPSTEN v RINKEBY CLASH ❗\n`);
} else {
  console.error(`\n\t\t ❗NO NETWORK DEFINED ❗\n`);
}
provider
  .getBlockNumber()
  .then(blocknumber =>
    console.log(`\n\t\t Current block number: ${blocknumber}`)
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
  "function execute(address _action, bytes _actionPayload) payable returns(bool success, bytes returndata)"
];
const userProxyContract = new ethers.Contract(
  userProxyAddress,
  userProxyABI,
  connectedWallet
);

// Arguments for userProxy.execute(address target, bytes memory data)
const TARGET_ADDRESS = actionMultiMintAddress;

// Arguments for function call to multiMintProxy.multiMint()
const START_TIME = Math.floor(Date.now() / 1000);
// Specific Action Params: encoded during main() execution
const USER = "0x203AdbbA2402a36C202F207caA8ce81f1A4c7a72";
const SRC_AMOUNT = ethers.utils.parseUnits("10", 18);
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
    USER,
    src,
    SRC_AMOUNT,
    dest,
    minConversionRate
  );
  console.log(
    `\t\t EncodedActionParams: \n ${ACTION_KYBER_PAYLOAD_WITH_SELECTOR}\n`
  );

  // Encode the payload for the call to MultiMintForTimeTrigger.multiMint
  const MULTI_MINT_PAYLOAD_WITH_SELECTOR = getMultiMintForTimeTriggerPayloadWithSelector(
    triggerTimestampPassedAddress,
    START_TIME.toString(),
    actionKyberTradeAddress,
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
    actionKyberTradeAddress,
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
  try {
    const tx = await userProxyContract.execute(
      TARGET_ADDRESS,
      MULTI_MINT_PAYLOAD_WITH_SELECTOR,
      {
        value: MSG_VALUE,
        gasLimit: 2000000
      }
    );
    console.log(
      `\n\t\t userProxy.execute(multiMintForTimeTrigger) txHash:\n \t${tx.hash}`
    );
    console.log("\n\t\t waiting for transaction to get mined \n");
    const txReceipt = await tx.wait();
    console.log(`\n\t\t minting tx mined in block ${txReceipt.blockNumber}`);
  } catch (err) {
    console.log(err);
  }
}

// What to execute when running node
main().catch(err => console.log(err));
