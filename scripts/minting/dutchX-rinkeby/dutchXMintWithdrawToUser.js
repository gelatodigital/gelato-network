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

// Setting up Provider and Signer (wallet)
const provider = new ethers.providers.InfuraProvider("rinkeby", INFURA_ID);
const wallet = ethers.Wallet.fromMnemonic(DEV_MNEMONIC);
const connectedWallet = wallet.connect(provider);

// Contract Addresses for instantiation
const GELATO_CORE_ADDRESS = "0x0e7dDacA829CD452FF341CF81aC6Ae4f0D2328A7";
const USER_PROXY_ADDRESS = "0x2cBe8EB80604B37d723C7a6A9f971c62F2E202b1";

// ReadInstance of GelatoCore
const gelatoCoreABI = [
  "function getMintingDepositPayable(address _action, address _selectedExecutor) view returns(uint)",
  "function getCurrentExecutionClaimId() view returns(uint)"
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
const MULTI_MINT_IMPL_ADDRESS = "0x03692e5B7fF7ceF44d34BEA26110d85E5a12b3Db";

// Arguments for function call to multiMintProxy.multiMint()
const TRIGGER_TIME_PROXY_ADDRESS = "0x7A154C838f0FE48944D0a04a125f4D0C80c9360F";
const START_TIME = Math.floor(Date.now() / 1000);
const ACTION_DUTCHX_SELL_IMPL_ADDRESS =
  "0xd41Dcd393262c226736c1aACe1a4DAc571bb20Eb";
// Specific Action Params: encoded during main() execution
const USER = "0x203AdbbA2402a36C202F207caA8ce81f1A4c7a72";
const SELL_TOKEN = "0xd0dab4e640d95e9e8a47545598c33e31bdb53c7c"; // rinkeby GNO
const BUY_TOKEN = "0xc778417e063141139fce010982780140aa0cd5ab"; // rinkeby WETH
const SELL_AMOUNT = ethers.utils.parseUnits("10", 18);
// minConversionRate async fetched from KyberNetwork during main() execution
const SELECTED_EXECUTOR_ADDRESS = "0x203AdbbA2402a36C202F207caA8ce81f1A4c7a72";
const INTERVAL_SPAN = "300"; // 300 seconds
const NUMBER_OF_MINTS = "2";

// ABI encoding function
const getActionDutchXSellPayloadWithSelector = require("./actionDutchXSellEncoder.js")
  .getActionDutchXSellPayloadWithSelector;
const getMultiMintForTimeTriggerPayloadWithSelector = require("../multi-mint/time-trigger/multiMintTimeTriggerEncoder.js")
  .getMultiMintForTimeTriggerPayloadWithSelector;

// The execution logic
async function main() {
  // Encode the specific params for ActionKyberTrade
  const ACTION_DUTCHX_SELL_PAYLOAD = getActionDutchXSellPayloadWithSelector(
    USER,
    SELL_TOKEN,
    BUY_TOKEN,
    SELL_AMOUNT
  );
  console.log(
    `\t\t Action Payload With Selector: \n ${ACTION_DUTCHX_SELL_PAYLOAD}\n`
  );

  // Encode the payload for the call to MultiMintForTimeTrigger.multiMint
  const MULTI_MINT_PAYLOAD_WITH_SELECTOR = getMultiMintForTimeTriggerPayloadWithSelector(
    TRIGGER_TIME_PROXY_ADDRESS,
    START_TIME.toString(),
    ACTION_DUTCHX_SELL_IMPL_ADDRESS,
    ACTION_DUTCHX_SELL_PAYLOAD,
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
    ACTION_DUTCHX_SELL_IMPL_ADDRESS,
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
      MULTI_MINT_IMPL_ADDRESS,
      MULTI_MINT_PAYLOAD_WITH_SELECTOR,
      {
        value: MSG_VALUE,
        gasLimit: 2000000
      }
    );
    console.log(
      `\n\t\t userProxy.execute(multiMintForTimeTrigger) txHash:\n \t${tx.hash}\n`
    );
    // The operation is NOT complete yet; we must wait until it is mined
    console.log("\t\t waiting for the execute transaction to get mined \n");
    txreceipt = await tx.wait();
    console.log("\t\t Execute TX Receipt:\n", txreceipt);
    console.log(`\n\t\t minting tx mined in block ${txreceipt.blockNumber}`);
  } catch (err) {
    console.log(err);
  }
}

// What to execute when running node
main().catch(err => console.log(err));
