// Import Contracts
const GelatoCore = artifacts.require("GelatoCore");
const GelatoDutchX = artifacts.require("GelatoDXSplitSellAndWithdraw");
const SellToken = artifacts.require("EtherToken");
const BuyToken = artifacts.require("TokenRDN");
const DutchExchangeProxy = artifacts.require("DutchExchangeProxy");
const DutchExchange = artifacts.require("DutchExchange");

// Helper functions
const timeTravel = require("./helpers/timeTravel.js");

// Global variables
const MAXGAS = 400000;
const BN = web3.utils.BN;
const GELATO_GAS_PRICE_BN = new BN(web3.utils.toWei("5", "gwei"));

// Split Sell Order Details
const TOTAL_SELL_VOLUME = web3.utils.toWei("20", "ether"); // 20 WETH
const NUM_SUBORDERS_BN = new BN("2");
const SUBORDER_SIZE_BN = new BN(web3.utils.toWei("10", "ether")); // 10 WETH
const INTERVAL_SPAN = "21600"; // 6 hours
const GDXSSAW_MAXGAS_BN = new BN("400000"); // 400.000 must be benchmarked
const GELATO_PREPAID_FEE_BN = GDXSSAW_MAXGAS_BN.mul(GELATO_GAS_PRICE_BN); // wei
// MSG_VALUE_BN needs .add(1) in GDXSSAW due to offset of last withdrawal executionClaim
const MSG_VALUE_BN = GELATO_PREPAID_FEE_BN.mul(NUM_SUBORDERS_BN.add(new BN(1))); // wei

let dutchExchangeProxy;
let dutchExchange;
let seller;
let accounts;
let sellToken;
let buyToken;
let mockExchangeContract;
let gelatoDutchXContract;
let gelatoCore;
let gelatoCoreOwner;
let orderId;
let orderState;
let executionTime;
let interfaceOrderId;
// Fetch the claim Ids
const executionClaimIds = [];

module.exports = {
    GelatoCore,
    GelatoDutchX,
    SellToken,
    BuyToken,
    DutchExchangeProxy,
    DutchExchange,
    timeTravel,
    MAXGAS,
    BN,
    GELATO_GAS_PRICE_BN,
    TOTAL_SELL_VOLUME,
    NUM_SUBORDERS_BN,
    SUBORDER_SIZE_BN,
    INTERVAL_SPAN,
    GDXSSAW_MAXGAS_BN,
    GELATO_PREPAID_FEE_BN,
    MSG_VALUE_BN,
    dutchExchangeProxy,
    dutchExchange,
    seller,
    accounts,
    sellToken,
    buyToken,
    gelatoDutchXContract,
    gelatoCore,
    gelatoCoreOwner,
    orderId,
    orderState,
    executionTime,
    interfaceOrderId,
    executionClaimIds
};
