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
let provider;
// Contracts for instantiation
let gelatoCoreAddress;

// Parameters needed
const AUCTION_INDEX = "684";
// Trigger
let triggerDutchXAuctionCleared;
// Specific Trigger Params
let sellToken;
let buyToken;
// Action
let actionWithdrawBalanceFromDutchXToUser;
// Action Params:
let user;
// const sellToken = "0xd0dab4e640d95e9e8a47545598c33e31bdb53c7c"; // rinkeby GNO
// const buyToken = "0xc778417e063141139fce010982780140aa0cd5ab"; // rinkeby WETH
// gelatoCore.mintExecutionClaim params
let selectedExecutor;

// The block from which we start
if (process.env.ROPSTEN) {
  console.log(`\n\t\t ✅ connected to ROPSTEN ✅ \n`);
  provider = new ethers.providers.InfuraProvider("ropsten", INFURA_ID);
} else if (process.env.RINKEBY) {
  console.log(`\n\t\t ✅ connected to RINKEBY ✅ \n`);
  provider = new ethers.providers.InfuraProvider("rinkeby", INFURA_ID);
  gelatoCoreAddress = "0x0e7dDacA829CD452FF341CF81aC6Ae4f0D2328A7";
  triggerDutchXAuctionCleared = "0xBe45753474D625952a26303C48B19AA47809165a";
  sellToken = "0xd0dab4e640d95e9e8a47545598c33e31bdb53c7c"; // rinkeby GNO
  buyToken = "0xc778417e063141139fce010982780140aa0cd5ab"; // rinkeby WETH
  actionWithdrawBalanceFromDutchXToUser =
    "0x7CC0deb5b72c5A3102Fc0a74f4fF3ac2D50249Da";
  user = "0x203AdbbA2402a36C202F207caA8ce81f1A4c7a72";
  selectedExecutor = "0x203AdbbA2402a36C202F207caA8ce81f1A4c7a72";
} else {
  console.log(`\n\t\t ❗NO NETWORK DEFINED ❗\n`);
}

// For chain reading/writing
const wallet = ethers.Wallet.fromMnemonic(DEV_MNEMONIC);
const connectedWallet = wallet.connect(provider);

// Read-Write Instance of GelatoCore
const gelatoCoreABI = [
  "function getMintingDepositPayable(address _action, address _selectedExecutor) view returns(uint)",
  "function mintExecutionClaim(address _trigger, bytes _triggerPayload, address _action, bytes _actionPayload, address _selectedExecutor) payable"
];
const gelatoCoreContract = new ethers.Contract(
  gelatoCoreAddress,
  gelatoCoreABI,
  connectedWallet
);

// ABI encoding function
const getTriggerPayloadWithSelector = require("./dutchx-encoders/triggerDXAuctionClearedEncoder.js")
  .getTriggerDXAuctionClearedPayloadWithSelector;
const getActionPayloadWithSelector = require("./dutchx-encoders/actionWithdrawBalanceFromDXToUserEncoder.js")
  .getActionWithdrawBalanceFromDXToUserPayloadWithSelector;

// The execution logic
async function main() {
  // Encode the specific params for ActionKyberTrade
  const TRIGGER_DUTCHX_AUCTION_CLEARED_PAYLOAD = getTriggerPayloadWithSelector(
    sellToken,
    buyToken,
    AUCTION_INDEX
  );
  console.log(
    `\t\t TriggerDutchXAuctionCleared Payload With Selector: \n ${TRIGGER_DUTCHX_AUCTION_CLEARED_PAYLOAD}\n`
  );

  // Encode the specific params for ActionKyberTrade
  const ACTION_WITHDRAW_BALANCE_FROM_DX_TO_USER_PAYLOAD = getActionPayloadWithSelector(
    user,
    buyToken
  );
  console.log(
    `\t\t ActionWithdrawBalanceAtFromDutchXToUser Payload With Selector: \n ${ACTION_WITHDRAW_BALANCE_FROM_DX_TO_USER_PAYLOAD}\n`
  );

  // Getting the current Ethereum price
  let etherscanProvider = new ethers.providers.EtherscanProvider();
  let ethUSDPrice = await etherscanProvider.getEtherPrice();
  console.log(`\n\t\t Ether price in USD: ${ethUSDPrice}`);

  const MINTING_DEPOSIT = await gelatoCoreContract.getMintingDepositPayable(
    actionWithdrawBalanceFromDutchXToUser,
    selectedExecutor
  );
  console.log(
    `\n\t\t Minting Deposit: ${ethers.utils.formatUnits(
      MINTING_DEPOSIT,
      "ether"
    )} ETH \t\t${ethUSDPrice *
      parseFloat(ethers.utils.formatUnits(MINTING_DEPOSIT, "ether"))} $`
  );

  // send tx to PAYABLE contract method
  let tx;
  try {
    tx = await gelatoCoreContract.mintExecutionClaim(
      triggerDutchXAuctionCleared,
      TRIGGER_DUTCHX_AUCTION_CLEARED_PAYLOAD,
      actionWithdrawBalanceFromDutchXToUser,
      ACTION_WITHDRAW_BALANCE_FROM_DX_TO_USER_PAYLOAD,
      selectedExecutor,
      {
        value: MINTING_DEPOSIT,
        gasLimit: 2000000
      }
    );
    console.log(
      `\n\t\t gelatoCore.mintExecutionClaim txHash:\n \t${tx.hash}\n`
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
