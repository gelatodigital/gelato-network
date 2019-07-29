/** Truffle Test (mocha-chai): automated integration test
 * default test suite
 *
 * List GelatoDutchX:
 * -----------------------------------------------------
 * -> GelatoCore.listInterface()
 * -----------------------------------------------------
 *  */

// IMPORT CONFIG VARIABLES
const gdxConfig = require("./gDX_configs_truffle_integration_tests.js");

// ********** Truffle/web3 setup ********
let accounts;
const SELLER = gdxConfig.EXECUTION_CLAIM_OWNER; // accounts[2]:
let seller; // account[2]

// Deployed contract instances
// Gelato
const GelatoCore = artifacts.require(`${gdxConfig.GELATO_CORE}`);
let gelatoCore;

const GelatoDutchX = artifacts.require(`${gdxConfig.GELATO_INTERFACE}`);
let gelatoDutchX;

// DutchX
const DutchExchange = artifacts.require(`${gdxConfig.DUTCHX}`);
let dutchExchange;

const SellToken = artifacts.require(`${gdxConfig.SELL_TOKEN}`);
let sellToken;

const BuyToken = artifacts.require(`${gdxConfig.BUY_TOKEN}`);
let buyToken;
// ********** Truffle/web3 setup EN ********

// GELATO_DUTCHX specific
// MaxGas
const GDX_MAXGAS_BN = gdxConfig.GDX_MAXGAS_BN;

// State shared across the unit tests
// tx returned data
let txReceipt;

// To be set variables
// Prior to GelatoCore.listInterface:
let gelatoCoreOwner; // accounts[0]
let gelatoDXOwner; // accounts[0]

// Default test suite
describe("default test suite: correct deployed instances and owners", () => {
  // suite root-level pre-hook: set the test suite variables to be shared among all tests
  before(async () => {
    // accounts
    accounts = await web3.eth.getAccounts();
    seller = accounts[2];

    // get Gelato instances
    gelatoCore = await GelatoCore.deployed();
    gelatoDutchX = await GelatoDutchX.deployed();

    // get DutchX instances
    dutchExchange = await DutchExchange.deployed();
    sellToken = await SellToken.deployed();
    buyToken = await BuyToken.deployed();
  });

  // ******** GELATO_DUTCHX default SELLER account checks ********
  it("has pre-specified SELLER and EXECUTOR match seller and executor", async () => {
    assert.strictEqual(seller, SELLER);
  });
  // ******** GELATO_DUTCHX default SELLER account checks END ********

  // ******** Default deployed instances tests ********
  it("retrieves deployed GelatoCore, GELATO_DUTCHX, DutchX, sell/buyToken instances", async () => {
    // Gelato
    assert.strictEqual(gelatoCore.address, GelatoCore.address);
    assert.strictEqual(gelatoDutchX.address, GelatoDutchX.address);

    // DutchX
    assert.strictEqual(dutchExchange.address, DutchExchange.address);
    assert.strictEqual(sellToken.address, SellToken.address);
    assert.strictEqual(buyToken.address, BuyToken.address);
  });
  // ******** Default deployed instances tests END ********

  // ******** Default ownership tests ********
  it("has accounts[0] as owners of Core and Interface and accounts[1] is not owner", async () => {
    gelatoCoreOwner = await gelatoCore.contract.methods.owner().call();
    gelatoDXOwner = await gelatoDutchX.contract.methods.owner().call();

    assert.strictEqual(gelatoCoreOwner, accounts[0]);
    assert.strictEqual(gelatoDXOwner, accounts[0]);
  });
  // ******** Default ownership tests END ********
});

// Test suite to end-to-end test the creation of a GELATO_DUTCHX style claims
describe("Listing GELATO_DUTCHX", () => {
  // ******** list GELATO_DUTCHX interface on Gelato Core and set its maxGas ********
  it(`lets Core-owner list gelatoDutchX on GelatoCore with its maxGas set`, async () => {
    await gelatoCore.contract.methods
      .listInterface(gelatoDutchX.address, GDX_MAXGAS_BN.toString())
      .send({ from: gelatoCoreOwner })
      .then(receipt => (txReceipt = receipt));

    const isWhitelisted = await gelatoCore.contract.methods
      .getInterfaceWhitelist(gelatoDutchX.address)
      .call();
    const maxGas = await gelatoCore.contract.methods
      .getInterfaceMaxGas(gelatoDutchX.address)
      .call(); // uint256

    assert.isTrue(isWhitelisted);
    assert.strictEqual(maxGas, GDX_MAXGAS_BN.toString());
  });
  // ******** list GELATO_DUTCHX interface on Gelato Core and set its maxGas END ********
  // ******** Event on core LogNewInterfaceListed ********
  it(`emits correct LogNewInterfaceLised(dappInterface, maxGas) on gelatoCore`, async () => {
    assert.exists(txReceipt.events.LogNewInterfaceListed);
    assert.strictEqual(
      txReceipt.events.LogNewInterfaceListed.returnValues.dappInterface,
      gelatoDutchX.address
    );
    assert.strictEqual(
      txReceipt.events.LogNewInterfaceListed.returnValues.maxGas,
      GDX_MAXGAS_BN.toString()
    );

    // Log the event return values
    console.log(
      "\n\n\n\t\t LogNewInterfaceLised Event Return Values:\n",
      txReceipt.events.LogNewInterfaceListed.returnValues,
      "\n"
    );
  });

  // ******** Event on core LogNewInterfaceListed END ********
});
