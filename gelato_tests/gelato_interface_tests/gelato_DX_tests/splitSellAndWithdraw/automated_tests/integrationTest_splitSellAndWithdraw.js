/** Automated integration test for GelatoDxSplitSellAndWithdraw
 * default test suite
 *
 * GelatoDXSplitSellAndWithdraw.splitSellOrder() covers:
 * -----------------------------------------------------
 * -> GelatoCore.mintClaim()
 *
 *
 * -----------------------------------------------------
 *
 * GelatoCore.execute() covers:
 * -----------------------------------------------------------------
 * IcedOut(GelatoDXSplitSellAndWithdraw).execute()
 * -> GelatoDXSplitSellAndWithdraw.execute() test coverage:
 * automated withdrawals (on interface)
 * -> executore payout (on core)
 * -----------------------------------------------------------------
 *  */
// Big Number stuff
const BN = web3.utils.BN;

// Gelato-Core specific
const GelatoCore = artifacts.require("GelatoCore");
// Constants
// GELATO_GAS_PRICE:
//  This is a state variable that got deployed with truffle migrate
//  and was set inside 3_deploy_gelato.js. We should import this variable
//  instead of hardcoding it.
//  It should match the truffle.js specified DEFAULT_GAS_PRICE_GWEI = 5
const GELATO_GAS_PRICE_BN = new BN(web3.utils.toWei("5", "gwei"));

// GDXSSAW specific
// Artifacts
const GelatoDXSplitSellAndWithdraw = artifacts.require(
  "GelatoDXSplitSellAndWithdraw"
);
const SellToken = artifacts.require("EtherToken");
const BuyToken = artifacts.require("TokenRDN");
// Constants
const GDXSSAW_MAXGAS = 400000;
const SELL_TOKEN = "0xaa588d3737b611bafd7bd713445b314bd453a5c8"; // WETH
const BUY_TOKEN = "0x8ACEe021a27779d8E98B9650722676B850b25E11"; // RDN
const TOTAL_SELL_VOLUME = 20; // 20 WETH
const NUM_SUBORDERS = 2;
const SUBORDER_SIZE = 10; // 10 WETH
const INTERVAL_SPAN = 21600; // 6 hours
// Big Number constants
const GDXSSAW_MAXGAS_BN = new BN(GDXSSAW_MAXGAS.toString()); // 400.000 must be benchmarked
const GELATO_PREPAID_FEE_BN = GDXSSAW_MAXGAS_BN.mul(GELATO_GAS_PRICE_BN); // wei
const NUM_SUBORDERS_BN = new BN(NUM_SUBORDERS.toString());
const MSG_VALUE = GELATO_PREPAID_FEE_BN.mul(NUM_SUBORDERS_BN).toString(); // wei

// To be set variables
let accounts;
let seller; // account[2]
let executionTime; // timestamp
let estimatedGasUsedGDXSSAWSplitSellOrder;
let acutalGasUsedGDXSSAWSplitSellOrder;
let estimatedGasUsedGCoreExecute;
let actualGasUsedGCoreExecute;

// State shared across the unit tests
// Deployed contract instances
let gelatoCore;
let gelatoDXSplitSellAndWithdraw;
// Deployed instances owners
let gelatoCoreOwner;
let gelatoDXSplitSellAndWithdrawOwner;
// Account used for non-ownership prevention tests
let notOwner; // account[1]

// Default test suite
contract(
  "default test suite: correct deployed instances and owners",
  async accounts => {
    // suite root-level pre-hook: set the test suite variables to be shared among all tests
    before(async () => {
      gelatoCore = await GelatoCore.deployed();
      gelatoDXSplitSellAndWithdraw = await GelatoDXSplitSellAndWithdraw.deployed();
    });

    // ******** Default deployed instances tests ********
    it("retrieves deployed GelatoCore and GelatoDXSplitSellAndWithdraw instances", async () => {
      assert.exists(gelatoCore.address);
      assert.exists(gelatoDXSplitSellAndWithdraw.address);
      assert.equal(gelatoCore.address, GelatoCore.address);
      assert.equal(
        gelatoDXSplitSellAndWithdraw.address,
        GelatoDXSplitSellAndWithdraw.address
      );
    });
    // ******** Default deployed instances tests END ********

    // ******** Default ownership tests ********
    it("has accounts[0] as owners of Core and Interface and accounts[1] is not owner", async () => {
      gelatoCoreOwner = await gelatoCore.contract.methods.owner().call();
      gelatoDXSplitSellAndWithdrawOwner = await gelatoDXSplitSellAndWithdraw.contract.methods
        .owner()
        .call();

      assert.equal(gelatoCoreOwner, accounts[0]);
      assert.equal(gelatoDXSplitSellAndWithdrawOwner, accounts[0]);

      assert.notEqual(
        gelatoCoreOwner,
        accounts[1],
        "accounts[1] was expected not to be gelatoCoreOwner"
      );
      assert.notEqual(
        gelatoDXSplitSellAndWithdrawOwner,
        accounts[1],
        "accounts[1] was not expected to be gelatoDXSplitSellAndWithdrawOwner"
      );

      notOwner = accounts[1];
    });
    // ******** Default ownership tests END ********
  }
);

// Test suite to end-to-end test the creation of a GDXSSAW style claims
describe("Listing GDXSSAW -> GDXSSAW.splitSellOrder() -> GelatoCore.mintClaim()", () => {
  // suite root-level pre-hook: set the test suite variables to be shared among all tests
  before(async () => {
    gelatoCore = await GelatoCore.deployed();
    gelatoDXSplitSellAndWithdraw = await GelatoDXSplitSellAndWithdraw.deployed();

    accounts = await web3.eth.getAccounts();
    seller = accounts[2];

    const block = await web3.eth.getBlockNumber();
    const blockDetails = await web3.eth.getBlock(block);
    const timestamp = blockDetails.timestamp;

    executionTime = timestamp;

    console.log(`Seller:
    expected: ${accounts[2]}
    actual:   ${seller}`);
    console.log(`SellToken:
    expected: 0xaa588d3737b611bafd7bd713445b314bd453a5c8
    actual:   ${SELL_TOKEN}`);
    console.log(`BuyToken:
    expected: 0x8ACEe021a27779d8E98B9650722676B850b25E11
    actual:   ${BUY_TOKEN}`);
  });

  // ******** list GDXSSAW interface on Gelato Core and set its maxGas ********
  it(`lets Core-owner list gelatoDXSplitSellAndWithdraw on GelatoCore with its maxGas set
  Event LogNewInterfaceListed:
  expected indexed address:  ${GelatoDXSplitSellAndWithdraw.address}
  expected interface maxGas: ${GDXSSAW_MAXGAS}`, async () => {
    await gelatoCore.contract.methods
      .listInterface(gelatoDXSplitSellAndWithdraw.address, GDXSSAW_MAXGAS)
      .send({ from: gelatoCoreOwner });

    let isWhitelisted = await gelatoCore.contract.methods
      .getInterfaceWhitelist(gelatoDXSplitSellAndWithdraw.address)
      .call();
    let maxGas = await gelatoCore.contract.methods
      .getInterfaceMaxGas(gelatoDXSplitSellAndWithdraw.address)
      .call(); // uint256

    assert.isTrue(isWhitelisted);
    assert.equal(GDXSSAW_MAXGAS, maxGas);
  });
  // ******** list GDXSSAW interface on Gelato Core and set its maxGas END ********

  // ******** GDXSSAW.splitSellOrder() gasUsed estimates ********
  it(`estimates GelatoDXSplitsellAndWithdraw.splitSellOrder() gasUsed`, async () => {
    gelatoDXSplitSellAndWithdraw.contract.methods
      .splitSellOrder(
        SELL_TOKEN,
        BUY_TOKEN,
        TOTAL_SELL_VOLUME,
        NUM_SUBORDERS,
        SUBORDER_SIZE,
        executionTime,
        INTERVAL_SPAN
      )
      .estimateGas({ from: seller, value: MSG_VALUE }, (error, gasAmount) => {
        if (error) {
          console.log(error);
        }
        estimatedGasUsedGDXSSAWSplitSellOrder = gasAmount;
        console.log(
          `Estimated gasUsed by GDXSSAW.splitSellOrder(): ${gasAmount}`
        );

        assert(true);
      });
  });
  // ******** GDXSSAW.splitSellOrder() gasUsed estimates END ********

  // ******** call GDXSSAW.splitSellOrder() and mint its execution claims on Core ********

  // NEED TO BE APPROVED FIRST
  it(`lets seller/anyone execute GelatoDXSplitSellAndWithdraw.splitSellOrder()
  Event LogNewOrderCreated:
  expected indexed orderId:  1
  expected indexed seller:   ${seller}`, async () => {
    txReceipt = await gelatoDXSplitSellAndWithdraw.contract.methods
      .splitSellOrder(
        SELL_TOKEN,
        BUY_TOKEN,
        TOTAL_SELL_VOLUME,
        NUM_SUBORDERS,
        SUBORDER_SIZE,
        executionTime,
        INTERVAL_SPAN
      )
      .send({ from: seller, value: MSG_VALUE });


      console.log(`MSG_VALUE: ${MSG_VALUE} ${typeof MSG_VALUE}`);

    assert(true);
  });
  // ******** call GDXSSAW.splitSellOrder() and mint its execution claims on Core END********
});
