// Big Numbers
const BN = require('bignumber.js');

// Gelato general variables
// Accounts
const EXECUTION_CLAIM_OWNER = "0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef"; // accounts[2]:
const EXECUTOR = "0x821aEa9a577a9b44299B9c15c88cf3087F3b5544"; // accounts[3]
// GelatoGasPrice -> Gelato Prepaid Fee
const GELATO_GAS_PRICE_BN = "5000000000";  // 5 gwei

// GELATO_DUTCHX CONTRACTS
const GELATO_CORE = "GelatoCore";
const GELATO_INTERFACE = "GelatoDutchX";
const DUTCHX = "DutchExchange";

// GELATO_DUTCHX specific
// Prepaid Fee Calc for GelatoDutchX
const GDX_MAXGAS_BN = new BN("400000"); // 400.000 must be benchmarked
const GDX_PREPAID_FEE_BN = GDX_MAXGAS_BN.mul(GELATO_GAS_PRICE_BN); // wei

// Tokens and amounts for Gelato DutchX
const SELL_TOKEN = "EtherToken";
const BUY_TOKEN = "TokenRDN";
const TOTAL_SELL_VOLUME = "20000000000000000000"; // 20 WETH
const NUM_SUBORDERS_BN = new BN("2");
const NUM_EXECUTIONCLAIMS_BN = new BN("3"); // NUM_SUBORDERS + lastWithdrawal
const SUBORDER_SIZE_BN = "10000000000000000000"; // 10 WETH
// PREPAYMENT for GelatoDutchX
const PREPAYMENT_BN = GDX_PREPAID_FEE_BN.mul(NUM_EXECUTIONCLAIMS_BN); // wei
// The interval span
const INTERVAL_SPAN = 21600; // 6 hours

module.exports = {
  EXECUTION_CLAIM_OWNER,
  EXECUTOR,
  GELATO_GAS_PRICE_BN,
  GELATO_CORE,
  GELATO_INTERFACE,
  DUTCHX,
  GDX_MAXGAS_BN,
  GDX_PREPAID_FEE_BN,
  PREPAYMENT_BN,
  SELL_TOKEN,
  BUY_TOKEN,
  TOTAL_SELL_VOLUME,
  NUM_SUBORDERS_BN,
  NUM_EXECUTIONCLAIMS_BN,
  SUBORDER_SIZE_BN,
  INTERVAL_SPAN
};
