/** @DEV: DO NOT USE `TRUFFLE TEST` as it force migrates and we are dependant on previous contract state
 * GelatoCore.execute() covers:
 * -----------------------------------------------------------------
 * IcedOut(GelatoDXSplitSellAndWithdraw).execute()
 * -----------------------------------------------------------------
 * -> GelatoDXSplitSellAndWithdraw.execute() test coverage:
 * -----------------------------------------------------------------
 * dutchExchange.depositAndSell() (on interface)
 * automated withdrawals (on interface)
 * -----------------------------------------------------------------
 * -> executore payout (on core)
 * -----------------------------------------------------------------
 * */
// Big Number stuff
const BN = web3.utils.BN;

// Artifacts
const GelatoCore = artifacts.require("GelatoCore");
const GelatoDXSplitSellAndWithdraw = artifacts.require(
  "GelatoDXSplitSellAndWithdraw"
);

// Arguments from process environment
const EXECUTIONCLAIM_ID = process.env.EXECUTIONCLAIM_ID;
// Caution for this ISOLATED test only
const INTERFACE_ORDER_ID = EXECUTIONCLAIM_ID;

// Constants
const GELATO_GAS_PRICE_BN = new BN(web3.utils.toWei("5", "gwei"));
const GDXSSAW_MAXGAS = "400000";
const GDXSSAW_MAXGAS_BN = new BN(GDXSSAW_MAXGAS.toString()); // 400.000 must be benchmarked
const GELATO_PREPAID_FEE_BN = GDXSSAW_MAXGAS_BN.mul(GELATO_GAS_PRICE_BN); // wei
const SELL_TOKEN = "0xAa588d3737B611baFD7bD713445b314BD453a5C8"; // WETH
const BUY_TOKEN = "0x8ACEe021a27779d8E98B9650722676B850b25E11"; // RDN
const SELL_AMOUNT = web3.utils.toWei("10", "ether"); // 10 WETH
// GelatoCore-specific
const EXECUTIONCLAIM_OWNER = "0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef"; // accounts[2]
// GDXSSAW-specific
const SELLER = EXECUTIONCLAIM_OWNER; // accounts[2];

// State shared across the unit tests
// accounts
let accounts;
// Deployed contract instances
let gelatoCore;
let gelatoDXSplitSellAndWithdraw;
// executionClaimId
let executionClaimId;
// tx returned data
let txHash;
let txReceipt;
let blockNumber;
// block data
let block; // e.g. getBlock(blockNumber).timstamp
let timestamp;

// GelatoCore-specifc
let executor; // accounts[3]

// @Dev: Do NOT redeploy contracts, we need the state of the contracts from
//  truffle test integrationTest_gdxssaw_splitSellOrder.js
// --> We use describe() NOT truffle's cleanroom contract()

// Default test suite
describe("default test suite: correct deployed instances", () => {
  // suite root-level pre-hook: set the test suite variables to be shared among all tests
  before(async () => {
    // set accounts
    accounts = await web3.eth.getAccounts();
    // deployed instances
    gelatoCore = await GelatoCore.deployed();
    gelatoDXSplitSellAndWithdraw = await GelatoDXSplitSellAndWithdraw.deployed();
  });

  // ******** Default deployed instances tests ********
  it("retrieves deployed GelatoCore and GelatoDXSplitSellAndWithdraw instances", async () => {
    assert.exists(gelatoCore.address);
    assert.exists(gelatoDXSplitSellAndWithdraw.address);
    assert.strictEqual(gelatoCore.address, GelatoCore.address);
    assert.strictEqual(
      gelatoDXSplitSellAndWithdraw.address,
      GelatoDXSplitSellAndWithdraw.address
    );
  });
  // ******** Default deployed instances tests END ********
});

// Test suite to end-to-end test the execution of a GDXSSAW style claim
describe("gelatoCore.execute() -> GDXSSAW.execute() -> burnExecutionClaim and executorPayout", async () => {
  // suite root-level pre-hook: set executor to accounts[3]
  before(() => {
    executor = accounts[3];
  });

  // ******** Make sure EXECUTIONCLAIM_ID env variable exists ********
  it("has an EXECUTIONCLAIM_ID in its process.env", () => {
    assert.exists(EXECUTIONCLAIM_ID);
    console.log(`\t\tEXECUTIONCLAIM_ID: ${EXECUTIONCLAIM_ID}`);
  });
  // ******** Make sure EXECUTIONCLAIM_ID env variable exists END ********

  // ********  Correct ownerOf(EXECUTIONCLAIM_ID) ********
  it("has the correct ownerOf(executionClaimId)", async () => {
    let executionClaimOwner = await gelatoCore.contract.methods.ownerOf(EXECUTIONCLAIM_ID).call();
    assert.strictEqual(executionClaimOwner, EXECUTIONCLAIM_OWNER);
    console.log(`\t\texecutionClaimOwner: ${executionClaimOwner}`);
  });
  // ********  Correct ownerOf(EXECUTIONCLAIM_ID) END ********

  // ******** GelatoCore.execute() gasUsed estimates ********
  it(`estimates GelatoCore.execute() gasUsed and logs gasLimit`, async () => {
    // Get and log estimated gasUsed by splitSellOrder fn
    gelatoCore.contract.methods.execute(EXECUTIONCLAIM_ID).estimateGas(
      { from: executor, gas: 1000000 }, // gas needed to prevent out of gas error
      async (error, estimatedGasUsed) => {
        if (error) {
          console.error;
        } else {
          // Get and log gasLimit
          await web3.eth.getBlock("latest", false, (error, block) => {
            if (error) {
              console.error;
            } else {
              block = block;
            }
          });
          console.log(`\t\tgasLimit:           ${block.gasLimit}`);
          console.log(`\t\testimated gasUsed:   ${estimatedGasUsed}`);
        }
      }
    );
    // This test just tried to get and log the estimate
    assert(true);
  });
  // ******** GelatoCore.execute() gasUsed estimates END ********

  // ******** Executor calls GelatoCore.execute() and gets payout ********
  it(`gelatoCore.execute() results in correct LogClaimExecutedAndDeleted and executor payout`, async () => {
    // we fetch data from the executionClaim to be executed
    let {
      executionClaimOwner,
      dappInterface,
      interfaceOrderId,
      sellToken,
      buyToken,
      sellAmount,
      executionTime,
      prepaidExecutionFee
    } = await gelatoCore.contract.methods
      .getExecutionClaim(EXECUTIONCLAIM_ID)
      .call();

    // Fetch current timestamp
    blockNumber = await web3.eth.getBlockNumber();
    block = await web3.eth.getBlock(blockNumber);
    timestamp = block.timestamp;

    // we check the fetched executionClaim data
    assert.strictEqual(executionClaimOwner, EXECUTIONCLAIM_OWNER);
    assert.strictEqual(executionClaimOwner, SELLER);
    assert.strictEqual(dappInterface, gelatoDXSplitSellAndWithdraw.address);
    assert.strictEqual(interfaceOrderId, INTERFACE_ORDER_ID);
    assert.strictEqual(sellToken, SELL_TOKEN);
    assert.strictEqual(buyToken, BUY_TOKEN);
    assert.strictEqual(sellAmount, SELL_AMOUNT);
    assert.isBelow(parseInt(executionTime), timestamp);
    assert.strictEqual(prepaidExecutionFee, GELATO_PREPAID_FEE_BN);

    console.log(
      `\t\t typeOf prepaidExecutionFee: ${typeof prepaidExecutionFee}`
    );

    // get executor's balance pre executionClaim minting
    let executorBalancePre = new BN(await web3.eth.getBalance(executor));

    // executor calls gelatoCore.execute(executionClaimId)
    // benchmarked gasUsed =
    await gelatoCore.contract.methods
      .execute(EXECUTIONCLAIM_ID)
      .send({ from: executor, gas: 1000000 }) // gas needed to prevent out of gas error
      .once("transactionHash", hash => (txHash = hash))
      .once("receipt", receipt => (txReceipt = receipt))
      .on("error", console.error);

    // Check that executor's balance has gone up by prepaidExecutionFee
    let executorBalancePost = new BN(await web3.eth.getBalance(executor));
    assert.strictEqual(
      executorBalancePost.toString(),
      executorBalancePre.add(prepaidExecutionFee).toString()
    );

    // emitted event on GelatoCore: LogClaimExecutedAndDeleted(dappInterface, executor, executionClaimId, executorPayout)
    assert.exists(txReceipt.events.LogClaimExecutedAndDeleted);

    // check if event has correct return values
    assert.strictEqual(
      txReceipt.events.LogClaimExecutedAndDeleted.returnValues.dappInterface,
      gelatoDXSplitSellAndWithdraw.address
    );
    assert.strictEqual(
      txReceipt.events.LogClaimExecutedAndDeleted.returnValues.executor,
      executor
    );
    assert.strictEqual(
      txReceipt.events.LogClaimExecutedAndDeleted.returnValues.executionClaimId,
      EXECUTIONCLAIM_ID
    );
    assert.strictEqual(
      txReceipt.events.LogClaimExecutedAndDeleted.returnValues
        .gelatoCorePayable,
      prepaidExecutionFee
    );

    // save the executionClaimId
    executionClaimId =
      txReceipt.events.LogClaimExecutedAndDeleted.returnValues.executionClaimId;

    // make sure executionClaim was burnt
    /* orderState = await gelatoDXSplitSellAndWithdraw.contract.methods
      .orderStates(orderId)
      .call();

    // check the orderState
    assert.isFalse(orderState.lastAuctionWasWaiting);
    assert.strictEqual(orderState.lastAuctionIndex, "0");
    assert.strictEqual(orderState.remainingSubOrders, NUM_SUBORDERS);
    assert.strictEqual(orderState.lastSellAmountAfterFee, "0");
    assert.strictEqual(orderState.remainingWithdrawals, NUM_SUBORDERS);*/

    // Log actual gasUsed
    console.log("\t\tactual gasUsed:     ", txReceipt.gasUsed);

    // Save transactions blockNumber for tests on GDXSSAW
    blockNumber = txReceipt.blockNumber;
  });
  // ******** Executor calls gelatoCore.execute() and gets payout END ********

  // ******** Execution Claim burned check  ********
  // ******** Execution Claim burned check  END ********
});
