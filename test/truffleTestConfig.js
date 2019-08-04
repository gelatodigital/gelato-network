// Import Contracts
const GelatoCore = artifacts.require("GelatoCore");
const GelatoDutchX = artifacts.require("GelatoDutchX");
const SellToken = artifacts.require("EtherToken");
const BuyToken = artifacts.require("TokenRDN");
const DutchExchangeProxy = artifacts.require("DutchExchangeProxy");
const DutchExchange = artifacts.require("DutchExchange");
const DxGetter = artifacts.require("DutchXGetter")

// Helper functions
const timeTravel = require("./helpers/timeTravel.js");
const {execShellCommand, execShellCommandLog} = require("./helpers/execShellCommand.js");
const truffleAssert = require('truffle-assertions');


// Global variables
const BN = web3.utils.BN;
const GELATO_GAS_PRICE_BN = new BN(web3.utils.toWei("5", "gwei"));
const GDX_MAXGAS_BN = new BN("500000"); // 500.000 must be benchmarked
const GDX_PREPAID_FEE_BN = GDX_MAXGAS_BN.mul(GELATO_GAS_PRICE_BN); // wei

// Split Sell Order Details
const numberOfSubOrders = "2"
const NUM_SUBORDERS_BN = new BN(numberOfSubOrders);
const TOTAL_SELL_VOLUME = web3.utils.toWei("20", "ether"); // 20 WETH
const SUBORDER_SIZE_BN = new BN(web3.utils.toWei("10", "ether")); // 10 WETH
const INTERVAL_SPAN = "21600"; // 6 hours
const MSG_VALUE_BN = GDX_PREPAID_FEE_BN.mul(NUM_SUBORDERS_BN); // wei

// To be set in truffle test
let dutchExchangeProxy;
let dutchExchange;
let seller;
let accounts;
let sellToken;
let buyToken;
let gelatoDutchXContract;
let gelatoCore;
let gelatoCoreOwner;
let orderStateId;
let orderState;
let executionTime;
let interfaceOrderId;
const executionClaimIds = [];

module.exports = {
    numberOfSubOrders,
    GelatoCore,
    GelatoDutchX,
    SellToken,
    BuyToken,
    DutchExchangeProxy,
    DutchExchange,
    timeTravel,
    BN,
    NUM_SUBORDERS_BN,
    GELATO_GAS_PRICE_BN,
    TOTAL_SELL_VOLUME,
    SUBORDER_SIZE_BN,
    INTERVAL_SPAN,
    GDX_MAXGAS_BN,
    GDX_PREPAID_FEE_BN,
    dutchExchangeProxy,
    dutchExchange,
    seller,
    accounts,
    sellToken,
    buyToken,
    gelatoDutchXContract,
    gelatoCore,
    gelatoCoreOwner,
    orderStateId,
    orderState,
    executionTime,
    interfaceOrderId,
    executionClaimIds,
    MSG_VALUE_BN,
    execShellCommand,
    DxGetter,
    execShellCommandLog,
    truffleAssert
};
