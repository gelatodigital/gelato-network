/** Automated integration test for GelatoDxSplitSellAndWithdraw
 * default test suite
 *
 * GelatoDXSplitSellAndWithdraw.splitSellOrder() covers:
 * -----------------------------------------------------
 * -> GelatoCore.mintClaim()
 * -----------------------------------------------------
 *  */
// To run shell scripts from inside node.js
const exec = require('childe_process').exec, child;

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
// Gelato-Core specific END

// GDXSSAW specific
// Artifacts
const GelatoDXSplitSellAndWithdraw = artifacts.require(
  "GelatoDXSplitSellAndWithdraw"
);
const SellToken = artifacts.require("EtherToken");
const BuyToken = artifacts.require("TokenRDN");
// Constants
const SELLER = "0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef"; // account[2]:
const SELL_TOKEN = "0xAa588d3737B611baFD7bD713445b314BD453a5C8"; // WETH
const BUY_TOKEN = "0x8ACEe021a27779d8E98B9650722676B850b25E11"; // RDN
const TOTAL_SELL_VOLUME = web3.utils.toWei("20", "ether"); // 20 WETH
const NUM_SUBORDERS_BN = new BN("2");
const SUBORDER_SIZE_BN = new BN(web3.utils.toWei("10", "ether")); // 10 WETH
const INTERVAL_SPAN_BN = new BN("21600"); // 6 hours
const GDXSSAW_MAXGAS_BN = new BN("400000"); // 400.000 must be benchmarked
const GELATO_PREPAID_FEE_BN = GDXSSAW_MAXGAS_BN.mul(GELATO_GAS_PRICE_BN); // wei
// MSG_VALUE_BN needs .add(1) in GDXSSAW due to offset of last withdrawal executionClaim
const MSG_VALUE_BN = GELATO_PREPAID_FEE_BN.mul(NUM_SUBORDERS_BN.add(new BN(1))); // wei
// GDXSSAW specific END

// State shared across the unit tests
// Deployed contract instances
let gelatoCore;
let gelatoDXSplitSellAndWithdraw;
// Deployed instances owners
let gelatoCoreOwner;
let gelatoDXSplitSellAndWithdrawOwner;
// tx returned data
let txHash;
let txReceipt;
let blockNumber;
// block data
let block; // e.g. getBlock(blockNumber).timstamp
let timestamp;

// To be set variables
// Prior to GDXSSAW.splitSellOrder() tx
let sellTokenContract;
let buyTokenContract;
let accounts;
let executionTime; // timestamp
// Post GDXSSAW.splitSellOrder() tx
let orderId;
let orderState;
let executionClaimIds = [];

// Prior to GelatoCore.execute() tx
let executor; // accounts[3]

// Post GelatoCore.execute() tx


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
      assert.strictEqual(gelatoCore.address, GelatoCore.address);
      assert.strictEqual(
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

      assert.strictEqual(gelatoCoreOwner, accounts[0]);
      assert.strictEqual(gelatoDXSplitSellAndWithdrawOwner, accounts[0]);

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
    });
    // ******** Default ownership tests END ********
  }
);



// Test suite to end-to-end test the creation of a GDXSSAW style claims
describe("Listing GDXSSAW", () => {
  // suite root-level pre-hook: set the test suite variables to be shared among all tests
  before(async () => {
    sellTokenContract = await SellToken.at(SELL_TOKEN);
    buyTokenContract = await BuyToken.at(BUY_TOKEN);

    accounts = await web3.eth.getAccounts();
  });

  // ******** GDXSSAW default deployed instances checks ********
  it(`fetches the correct deployed sellToken and buyToken contracts`, async () => {
    assert.exists(sellTokenContract.address);
    assert.exists(buyTokenContract.address);
    assert.strictEqual(sellTokenContract.address, SELL_TOKEN);
    assert.strictEqual(buyTokenContract.address, BUY_TOKEN);
  });
  // ******** GDXSSAW default deployed instances checks END ********

  // ******** GDXSSAW default SELLER account checks ********
  it(`has accounts[2] set as the SELLER`, async () => {
    assert.strictEqual(SELLER, accounts[2]);
  });
  // ******** GDXSSAW default SELLER account checks END ********

  // ******** list GDXSSAW interface on Gelato Core and set its maxGas ********
  it(`lets Core-owner list gelatoDXSplitSellAndWithdraw on GelatoCore with its maxGas set`, async () => {
    await gelatoCore.contract.methods
      .listInterface(gelatoDXSplitSellAndWithdraw.address, GDXSSAW_MAXGAS)
      .send({ from: gelatoCoreOwner })
      .then(receipt => (txReceipt = receipt));

    const isWhitelisted = await gelatoCore.contract.methods
      .getInterfaceWhitelist(gelatoDXSplitSellAndWithdraw.address)
      .call();
    const maxGas = await gelatoCore.contract.methods
      .getInterfaceMaxGas(gelatoDXSplitSellAndWithdraw.address)
      .call(); // uint256

    assert.isTrue(isWhitelisted);
    assert.strictEqual(maxGas, GDXSSAW_MAXGAS);
  });
  // ******** list GDXSSAW interface on Gelato Core and set its maxGas END ********
  // ******** Event on core LogNewInterfaceListed ********
  it(`emits correct LogNewInterfaceLised(dappInterface, maxGas) on gelatoCore`, async () => {
    assert.exists(txReceipt.events.LogNewInterfaceListed);
    assert.strictEqual(
      txReceipt.events.LogNewInterfaceListed.returnValues.dappInterface,
      gelatoDXSplitSellAndWithdraw.address
    );
    assert.strictEqual(
      txReceipt.events.LogNewInterfaceListed.returnValues.maxGas,
      GDXSSAW_MAXGAS
    );
  });
  // ******** Event on core LogNewInterfaceListed END ********
});



// ********************* SPLITSELLORDER -> MINT_CLAIMS *********************
describe("GDXSSAW.splitSellOrder() -> GelatoCore.mintClaim()", () => {
  // ******** Seller ERC20 approves the GDXSSAW for TotalSellVolume ********
  it(`seller approves GelatoDXSplitsellAndWithdraw for the TOTAL_SELL_VOLUME`, async () => {
    await sellTokenContract.contract.methods
      .approve(gelatoDXSplitSellAndWithdraw.address, TOTAL_SELL_VOLUME)
      .send({ from: SELLER });

    const allowance = await sellTokenContract.contract.methods
      .allowance(SELLER, gelatoDXSplitSellAndWithdraw.address)
      .call();

    assert.strictEqual(
      allowance,
      TOTAL_SELL_VOLUME,
      `The ERC20 ${
        sellTokenContract.address
      } allowance for the GelatoDXSplitsellAndWithdraw should be at ${TOTAL_SELL_VOLUME}`
    );
  });
  // ******** Seller ERC20 approves the GDXSSAW for TotalSellVolume END ********

  // ******** GDXSSAW.splitSellOrder() gasUsed estimates ********
  it(`estimates GelatoDXSplitsellAndWithdraw.splitSellOrder() gasUsed and logs gasLimit`, async () => {
    // First set the executiontime
    blockNumber = await web3.eth.getBlockNumber();
    block = await web3.eth.getBlock(blockNumber);
    timestamp = block.timestamp;
    executionTime = timestamp;

    // Get and log estimated gasUsed by splitSellOrder fn
    gelatoDXSplitSellAndWithdraw.contract.methods
      .splitSellOrder(
        SELL_TOKEN,
        BUY_TOKEN,
        TOTAL_SELL_VOLUME,
        NUM_SUBORDERS_BN,
        SUBORDER_SIZE_BN,
        executionTime,
        INTERVAL_SPAN_BN
      )
      .estimateGas(
        { from: SELLER, value: MSG_VALUE_BN, gas: 1000000 }, // gas needed to prevent out of gas error
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
  // ******** GDXSSAW.splitSellOrder() gasUsed estimates END ********

  // ******** seller calls GDXSSAW.splitSellOrder() ********
  it(`GDXSSAW.splitSellOrder() works with correct msg.value received on Core and LogNewOrderCreated event`, async () => {
    // First get gelatoCore's balance pre executionClaim minting
    let gelatoCoreBalancePre = new BN(
      await web3.eth.getBalance(gelatoCore.address)
    );
    // Second set the executiontime
    blockNumber = await web3.eth.getBlockNumber();
    block = await web3.eth.getBlock(blockNumber);
    timestamp = block.timestamp;
    executionTime = timestamp;

    // benchmarked gasUsed = 726,360 (for 2 subOrders + 1 lastWithdrawal)
    await gelatoDXSplitSellAndWithdraw.contract.methods
      .splitSellOrder(
        SELL_TOKEN,
        BUY_TOKEN,
        TOTAL_SELL_VOLUME,
        NUM_SUBORDERS_BN,
        SUBORDER_SIZE_BN,
        executionTime,
        INTERVAL_SPAN_BN
      )
      .send({ from: SELLER, value: MSG_VALUE_BN, gas: 1000000 }) // gas needed to prevent out of gas error
      .once("transactionHash", hash => (txHash = hash))
      .once("receipt", receipt => (txReceipt = receipt))
      .on("error", console.error);

    // Check that gelatoCore has received msg.value funds in its balance
    let gelatoCoreBalancePost = new BN(
      await web3.eth.getBalance(gelatoCore.address)
    );
    assert.strictEqual(
      gelatoCoreBalancePost.toString(),
      gelatoCoreBalancePre.add(MSG_VALUE_BN).toString()
    );

    // emitted event on GDXSSAW: LogNewOrderCreated(orderId, seller)
    assert.exists(txReceipt.events.LogNewOrderCreated);

    // check if event has correct return values
    assert.strictEqual(
      txReceipt.events.LogNewOrderCreated.returnValues.seller,
      SELLER
    );
    assert.strictEqual(
      txReceipt.events.LogNewOrderCreated.returnValues.orderId,
      "1"
    );

    // save the orderId
    orderId = txReceipt.events.LogNewOrderCreated.returnValues.orderId;

    // fetch the newly created orderState on GDXSSAW
    orderState = await gelatoDXSplitSellAndWithdraw.contract.methods
      .orderStates(orderId)
      .call();

    // check the orderState
    assert.isFalse(orderState.lastAuctionWasWaiting);
    assert.strictEqual(orderState.lastAuctionIndex, "0");
    assert.strictEqual(orderState.remainingSubOrders, NUM_SUBORDERS_BN);
    assert.strictEqual(orderState.lastSellAmountAfterFee, "0");
    assert.strictEqual(orderState.remainingWithdrawals, NUM_SUBORDERS_BN);

    // Log actual gasUsed
    console.log("\t\tactual gasUsed:     ", txReceipt.gasUsed);

    // Save transactions blockNumber for next event emission test
    blockNumber = txReceipt.blockNumber;
  });
  // ******** seller calls GDXSSAW.splitSellOrder() and mint its execution claims on Core END********

  // ******** Events on gelatoCore ********
  it(`emits correct LogNewExecutionClaimMinted events on gelatoCore`, async () => {
    // Filter events emitted from gelatoCore
    /*let filter = {
      dappInterface: gelatoDXSplitSellAndWithdraw.address,
      interfaceOrderId: orderId,
      executionClaimOwner: SELLER
    };*/ // @dev: cannot get filter to work (not needed tho)
    let _events;
    await gelatoCore.getPastEvents(
      "LogNewExecutionClaimMinted",
      // { filter, fromBlock: parseInt(blockNumber) },  // exercise: make this work
      (error, events) => {
        if (error) {
          console.error;
        } else {
          // correct number of LogNewExecutionClaimMinted events were emitted
          assert.strictEqual(events.length, parseInt(NUM_SUBORDERS_BN) + 1); // +1=lastWithdrawal

          // Further event data checks and fetching of executionClaimIds
          i = 1; // for the executionClaimId checking
          for (event of events) {
            assert.strictEqual(event.event, "LogNewExecutionClaimMinted");
            assert.strictEqual(event.blockNumber, blockNumber);
            assert.strictEqual(
              event.returnValues.dappInterface,
              gelatoDXSplitSellAndWithdraw.address
            );
            assert.strictEqual(event.returnValues.interfaceOrderId, orderId);
            assert.strictEqual(event.returnValues.executionClaimOwner, SELLER);
            assert.strictEqual(
              event.returnValues.gelatoCoreReceivable,
              GELATO_PREPAID_FEE_BN.toString()
            );
            // check the executionClaimIds
            assert.strictEqual(
              event.returnValues.executionClaimId,
              i.toString()
            );
            i++;

            // Save the executionClaimIds
            executionClaimIds.push(event.returnValues.executionClaimId);

            // Hold on to events for later assert.exists
            _events = events;
          }
        }
      }
    );
    // Make sure events were emitted
    assert.exists(_events);
  });
  // ******** Events on gelatoCore END ********

  // ******** Minted execution claims on Core ********
  it(`mints the correct ExecutionClaim structs on gelatoCore`, async () => {
    let executionTimes = new BN(executionTime.toString());
    // fetch each executionClaim from core and test it
    for (executionClaimId of executionClaimIds) {
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
        .getExecutionClaim(executionClaimId)
        .call();

      assert.strictEqual(executionClaimOwner, SELLER);
      assert.strictEqual(dappInterface, gelatoDXSplitSellAndWithdraw.address);
      assert.strictEqual(interfaceOrderId, orderId);
      assert.strictEqual(sellToken, SELL_TOKEN);
      assert.strictEqual(buyToken, BUY_TOKEN);
      assert.strictEqual(sellAmount, SUBORDER_SIZE_BN);
      assert.strictEqual(executionTime, executionTimes.toString());
      assert.strictEqual(prepaidExecutionFee, GELATO_PREPAID_FEE_BN.toString());

      executionTimes.add(INTERVAL_SPAN_BN);
    }
  });
  // ******** Minted execution claims on Core END ********
});
// ********************* SPLITSELLORDER -> MINT_CLAIMS END *********************



// ********************* SHELL SCRIPTS -> DUTCHX MANIPULATION *********************
// DutchX Auction Time Logic
child = exec("yarn close-auction-1", async (error, stdout, stderr) => {
  if (error) {
    console.error;
  } else {
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
  }
});
// Run the close-auction-1 child process
child();
// ********************* SHELL SCRIPTS -> DUTCHX MANIPULATION END *********************



// ********************* EXECUTE *********************
// Test suite to end-to-end test the EXECUTION of a GDXSSAW style claim
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
    assert.strictEqual(orderState.remainingSubOrders, NUM_SUBORDERS_BN);
    assert.strictEqual(orderState.lastSellAmountAfterFee, "0");
    assert.strictEqual(orderState.remainingWithdrawals, NUM_SUBORDERS_BN);*/

    // Log actual gasUsed
    console.log("\t\tactual gasUsed:     ", txReceipt.gasUsed);

    // Save transactions blockNumber for tests on GDXSSAW
    blockNumber = txReceipt.blockNumber;
  });
  // ******** Executor calls gelatoCore.execute() and gets payout END ********

  // ******** Execution Claim burned check  ********
  // ******** Execution Claim burned check  END ********
});
