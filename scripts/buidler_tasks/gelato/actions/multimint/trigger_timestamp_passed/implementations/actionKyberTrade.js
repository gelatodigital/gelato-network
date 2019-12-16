// Buidler config
import buidler from "@nomiclabs/buidler";

// Javascript Ethereum API Library
import { providers, Wallet, Contract, utils } from "ethers";

// Helpers
import { sleep } from "../../helpers/sleep.js";

// Contract Addresses
let actionMultiMintTimeTriggerAddress;
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
  provider = new providers.InfuraProvider("ropsten", INFURA_ID);
  gelatoCoreAddress = process.env.GELATO_CORE_ADDRESS_ROPSTEN;
  kyberProxyAddress = "0x818E6FECD516Ecc3849DAf6845e3EC868087B755";
  userProxyAddress = process.env.USER_PROXY_ADDRESS_ROPSTEN;
  actionMultiMintTimeTriggerAddress =
    process.env.ACTION_MULTI_MINT_TIME_TRIGGER_ADDRESS_ROPSTEN;
  triggerTimestampPassedAddress = process.env.TRIGGER_TIMESTAMP_PASSED_ROPSTEN;
  actionKyberTradeAddress = process.env.ACTION_KYBER_TRADE_ROPSTEN;
  src = "0x4E470dc7321E84CA96FcAEDD0C8aBCebbAEB68C6"; // Ropsten KNC
  dest = "0xaD6D458402F60fD3Bd25163575031ACDce07538D"; // Ropsten DAI
} else {
  console.error(`\n\t\t ❗NO NETWORK DEFINED ❗\n`);
}
provider
  .getBlockNumber()
  .then(blocknumber =>
    console.log(`\n\t\t Current block number: ${blocknumber}`)
  );

// Signer (wallet)
const wallet = Wallet.fromMnemonic(DEV_MNEMONIC);
const connectedWallet = wallet.connect(provider);

// Read Instance of KyberContract
const kyberABI = [
  "function getExpectedRate(address src, address dest, uint srcQty) view returns(uint,uint)"
];
const kyberContract = new Contract(kyberProxyAddress, kyberABI, provider);

// ReadInstance of GelatoCore
const gelatoCoreABI = [
  "function getMintingDepositPayable(address _selectedExecutor, address _action) view returns(uint)"
];
const gelatoCoreContract = new Contract(
  gelatoCoreAddress,
  gelatoCoreABI,
  provider
);

// Read-Write Instance of UserProxy
const userProxyABI = [
  "function execute(address _action, bytes _actionPayload) payable returns(bool success, bytes returndata)"
];
const userProxyContract = new Contract(
  userProxyAddress,
  userProxyABI,
  connectedWallet
);

// Arguments for userProxy.execute(address target, bytes memory data)
const TARGET_ADDRESS = actionMultiMintTimeTriggerAddress;

// Arguments for function call to multiMintProxy.multiMint()
const START_TIME = Math.floor(Date.now() / 1000);
// Specific Action Params: encoded during main() execution
const USER = "0x203AdbbA2402a36C202F207caA8ce81f1A4c7a72";
const SRC_AMOUNT = utils.parseUnits("10", 18);
// minConversionRate async fetched from KyberNetwork during main() execution
const SELECTED_EXECUTOR_ADDRESS = "0x203AdbbA2402a36C202F207caA8ce81f1A4c7a72";
const INTERVAL_SPAN = "120"; // 300 seconds
const NUMBER_OF_MINTS = "2";

// ABI encoding function
import { getActionKyberTradePayloadWithSelector } from "./kyber_encoders/actionKyberTradeEncoder.js";
import { getMultiMintForTimeTriggerPayloadWithSelector } from "../multi_mint/time_trigger/multiMintTimeTriggerEncoder.js";

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
    `\n\t\t minConversionRate: ${utils.formatUnits(minConversionRate, 18)}\n`
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
    `\t\t ActionKyber Payload With Selector: \n ${ACTION_KYBER_PAYLOAD_WITH_SELECTOR}\n`
  );

  // Encode the payload for the call to MultiMintForTimeTrigger.multiMint
  const MULTI_MINT_PAYLOAD_WITH_SELECTOR = getMultiMintForTimeTriggerPayloadWithSelector(
    SELECTED_EXECUTOR_ADDRESS,
    triggerTimestampPassedAddress,
    START_TIME.toString(),
    actionKyberTradeAddress,
    ACTION_KYBER_PAYLOAD_WITH_SELECTOR,
    INTERVAL_SPAN,
    NUMBER_OF_MINTS
  );
  console.log(
    `\t\t Encoded Payload With Selector for multiMint:\n ${MULTI_MINT_PAYLOAD_WITH_SELECTOR}\n`
  );

  // Getting the current Ethereum price
  let etherscanProvider = new providers.EtherscanProvider();
  let ethUSDPrice = await etherscanProvider.getEtherPrice();
  console.log(`\n\t\t Ether price in USD: ${ethUSDPrice}`);

  const MINTING_DEPOSIT_PER_MINT = await gelatoCoreContract.getMintingDepositPayable(
    SELECTED_EXECUTOR_ADDRESS,
    actionKyberTradeAddress
  );
  console.log(
    `\n\t\t Minting Deposit Per Mint: ${utils.formatUnits(
      MINTING_DEPOSIT_PER_MINT,
      "ether"
    )} ETH \t\t${ethUSDPrice *
      parseFloat(utils.formatUnits(MINTING_DEPOSIT_PER_MINT, "ether"))} $`
  );
  const MSG_VALUE = MINTING_DEPOSIT_PER_MINT.mul(NUMBER_OF_MINTS);
  console.log(
    `\n\t\t Minting Deposit for ${NUMBER_OF_MINTS} mints: ${utils.formatUnits(
      MSG_VALUE,
      "ether"
    )} ETH \t ${ethUSDPrice *
      parseFloat(utils.formatUnits(MSG_VALUE, "ether"))} $`
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
