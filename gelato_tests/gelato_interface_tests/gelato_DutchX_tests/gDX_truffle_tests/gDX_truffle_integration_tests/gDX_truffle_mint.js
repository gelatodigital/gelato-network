/** Truffle Test (mocha-chai): automated integration test for GelatoDxSplitSellAndWithdraw
 * default test suite
 *
 * GelatoDutchX.splitSellOrder() covers:
 * -----------------------------------------------------
 * -> GelatoCore.mintClaim()
 * -----------------------------------------------------
 *  */

// IMPORT CONFIG VARIABLES
const gdxConfig = require("./gDX_configs_truffle_integration_tests.js");

// BigNumber stuff
const BN = web3.utils.BN;

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

const SELL_TOKEN = gdxConfig.SELL_TOKEN_STRING;
const SellToken = artifacts.require(`${gdxConfig.SELL_TOKEN}`);
let sellToken;

const BuyToken = artifacts.require(`${gdxConfig.BUY_TOKEN}`);
let buyToken;
// ********** Truffle/web3 setup EN ********

// GELATO_DUTCHX specific
// PREPAID FEE per GDX execClaim and total PREPAYMENT
const GDX_PREPAID_FEE_BN = gdxConfig.GDX_PREPAID_FEE_BN;
const PREPAYMENT_BN = gdxConfig.PREPAYMENT_BN;
const TOTAL_SELL_VOLUME = gdxConfig.TOTAL_SELL_VOLUME;
const NUM_SUBORDERS_BN = gdxConfig.NUM_SUBORDERS_BN;
const NUM_EXECUTIONCLAIMS_BN = gdxConfig.NUM_EXECUTIONCLAIMS_BN;
const SUBORDER_SIZE_BN = gdxConfig.SUBORDER_SIZE_BN;
const INTERVAL_SPAN = gdxConfig.INTERVAL_SPAN;

// State shared across the unit tests
// tx returned data
let txHash;
let txReceipt;
let blockNumber;
// block data
let block; // e.g. getBlock(blockNumber).timstamp
let timestamp;

// To be set variables
// Prior to GELATO_DUTCHX.splitSellOrder():
let executionTime; // timestamp

// Post GELATO_DUTCHX.splitSellOrder():
let orderId;
let orderState;
let executionClaimIds = [];

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
});

// ******************** ENDOW SELLER ********************
describe("Endowing seller with totalSellVolume SellToken", function() {
  this.timeout(30000);
  it("endows seller with totalSellVolume SellToken", async () => {
    let totalSellVolumeETH = web3.utils.fromWei(TOTAL_SELL_VOLUME, "ether");
    let output = await execShellCommand(
      `export SELLER=${seller} && export SELL_TOKEN=${SELL_TOKEN} && export SELL_AMOUNT=${totalSellVolumeETH} && yarn gdx-endow-seller`
    );
    assert.exists(output);

    // Make sure seller received sellTokens
    let sellerBalance = await sellToken.contract.methods
      .balanceOf(seller)
      .call();
    assert(
      sellerBalance >= TOTAL_SELL_VOLUME,
      "Seller balance of SellToken is below TOTAL_SELL_VOLUME"
    );
  });
});
// ******************** ENDOW SELLER END ********************

// ********************* SPLITSELLORDER -> MINT_CLAIMS *********************
describe("GELATO_DUTCHX.splitSellOrder() -> GelatoCore.mintClaim()", () => {
  // ******** Seller ERC20 approves the GELATO_DUTCHX for TotalSellVolume ********
  it(`seller approves GelatoDXSplitsellAndWithdraw for the TOTAL_SELL_VOLUME`, async () => {
    await sellToken.contract.methods
      .approve(gelatoDutchX.address, TOTAL_SELL_VOLUME)
      .send({ from: seller });

    const allowance = await sellToken.contract.methods
      .allowance(seller, gelatoDutchX.address)
      .call();

    assert.strictEqual(
      allowance,
      TOTAL_SELL_VOLUME,
      `The ERC20 ${
        sellToken.address
      } allowance for the GelatoDXSplitsellAndWithdraw should be at ${TOTAL_SELL_VOLUME}`
    );
  });
  // ******** Seller ERC20 approves the GELATO_DUTCHX for TotalSellVolume END ********

  // ******** GELATO_DUTCHX.splitSellOrder() gasUsed estimates ********
  it(`estimates GelatoDXSplitsellAndWithdraw.splitSellOrder() gasUsed and logs gasLimit`, async () => {
    // First set the executiontime
    blockNumber = await web3.eth.getBlockNumber();
    block = await web3.eth.getBlock(blockNumber);
    timestamp = block.timestamp;
    executionTime = timestamp + 15; // to account for latency

    // Get and log estimated gasUsed by splitSellOrder fn
    gelatoDutchX.contract.methods
      .splitSellOrder(
        sellToken.address,
        buyToken.address,
        TOTAL_SELL_VOLUME,
        NUM_SUBORDERS_BN.toString(),
        SUBORDER_SIZE_BN.toString(),
        executionTime,
        INTERVAL_SPAN
      )
      .estimateGas(
        { from: SELLER, value: PREPAYMENT_BN.toString(), gas: 1000000 }, // gas needed to prevent out of gas error
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
  // ******** GELATO_DUTCHX.splitSellOrder() gasUsed estimates END ********

  // ******** seller calls GELATO_DUTCHX.splitSellOrder() ********
  it(`GELATO_DUTCHX.splitSellOrder() works with correct fundings and LogNewOrderCreated event`, async () => {
    // Core Funding: get gelatoCore's balance pre executionClaim minting
    let gelatoCoreBalancePre = await web3.eth.getBalance(gelatoCore.address);

    // Interface Funding: get interface sellToken balance pre executionClaim minting
    let gDXSellTokenBalancePre = await sellToken.contract.methods
      .balanceOf(gelatoDutchX.address)
      .call();

    // Second set the executiontime
    blockNumber = await web3.eth.getBlockNumber();
    block = await web3.eth.getBlock(blockNumber);
    timestamp = block.timestamp;
    executionTime = timestamp + 15; // to account for latency

    // benchmarked gasUsed = 726,360 (for 2 subOrders + 1 lastWithdrawal)
    await gelatoDutchX.contract.methods
      .splitSellOrder(
        sellToken.address,
        buyToken.address,
        TOTAL_SELL_VOLUME,
        NUM_SUBORDERS_BN.toString(),
        SUBORDER_SIZE_BN.toString(),
        executionTime,
        INTERVAL_SPAN
      )
      .send({ from: SELLER, value: PREPAYMENT_BN, gas: 1000000 }) // gas needed to prevent out of gas error
      .once("transactionHash", hash => (txHash = hash))
      .once("receipt", receipt => (txReceipt = receipt))
      .on("error", console.error);

    // Check that gelatoCore has received msg.value funds in its balance
    let gelatoCoreBalancePost = await web3.eth.getBalance(gelatoCore.address);
    assert.strictEqual(
      parseInt(gelatoCoreBalancePost),
      parseInt(gelatoCoreBalancePre) + parseInt(PREPAYMENT_BN)
    );

    // Check that gDX interface has received sellTokens
    let gDXSellTokenBalancePost = await sellToken.contract.methods
      .balanceOf(gelatoDutchX.address)
      .call();
    assert.strictEqual(
      parseInt(gDXSellTokenBalancePost),
      parseInt(gDXSellTokenBalancePre) + parseInt(TOTAL_SELL_VOLUME)
    );

    // emitted event on GELATO_DUTCHX: LogNewOrderCreated(orderId, seller)
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

    // fetch the newly created orderState on GELATO_DUTCHX
    orderState = await gelatoDutchX.contract.methods
      .orderStates(orderId)
      .call();

    // check the orderState
    assert.isFalse(orderState.lastAuctionWasWaiting);
    assert.strictEqual(orderState.lastAuctionIndex, "0");
    assert.strictEqual(
      orderState.remainingSubOrders,
      NUM_SUBORDERS_BN.toString()
    );
    assert.strictEqual(orderState.lastSellAmountAfterFee, "0");
    assert.strictEqual(
      orderState.remainingWithdrawals,
      NUM_SUBORDERS_BN.toString()
    );

    // Log actual gasUsed
    console.log("\t\tactual gasUsed:     ", txReceipt.gasUsed);

    // LogNewOrderCreated return values
    console.log(
      "\n\n\n\t\t LogNewOrderCreated Event Return Values:\n",
      txReceipt.events.LogNewOrderCreated.returnValues,
      "\n"
    );

    // Save transactions blockNumber for next event emission test
    blockNumber = txReceipt.blockNumber;
  });
  // ******** seller calls GELATO_DUTCHX.splitSellOrder() and mint its execution claims on Core END********

  // ******** Events on gelatoCore ********
  it(`emits correct LogNewExecutionClaimMinted events on gelatoCore`, async () => {
    // Filter events emitted from gelatoCore
    /*let filter = {
      dappInterface: gelatoDutchX.address,
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
              gelatoDutchX.address
            );
            assert.strictEqual(event.returnValues.interfaceOrderId, orderId);
            assert.strictEqual(event.returnValues.executionClaimOwner, SELLER);
            assert.strictEqual(
              event.returnValues.gelatoCoreReceivable,
              GDX_PREPAID_FEE_BN.toString()
            );
            // check the executionClaimIds
            assert.strictEqual(
              event.returnValues.executionClaimId,
              i.toString()
            );
            i++;

            // Save the executionClaimIds
            executionClaimIds.push(event.returnValues.executionClaimId);

            // LogNewExecutionClaimMinted return values
            console.log(
              "\n\n\n\t\t LogNewExecutionClaimMinted Event Return Values:\n",
              event.returnValues,
              "\n"
            );
          } // END FOR LOOP

          // Hold on to events for later assert.exists
          _events = events;
        }
      }
    );
    // Make sure events were emitted
    assert.exists(_events);
  });
  // ******** Events on gelatoCore END ********

  // ******** Minted execution claims on Core ********
  it(`mints the correct ExecutionClaim structs on gelatoCore`, async () => {
    // Make sure correct number of execution claim ids were fetched
    assert.strictEqual(
      executionClaimIds.length.toString(),
      NUM_EXECUTIONCLAIMS_BN.toString()
    );

    // fetch each executionClaim from core and test it
    let executionTimes = parseInt(executionTime);
    for (executionClaimId of executionClaimIds) {
      let {
        executionClaimOwner,
        dappInterface,
        interfaceOrderId,
        sellToken: _sellToken,
        buyToken: _buyToken,
        sellAmount,
        executionTime: _executionTime,
        prepaidExecutionFee
      } = await gelatoCore.contract.methods
        .getExecutionClaim(executionClaimId)
        .call();
      assert.strictEqual(executionClaimOwner, SELLER);
      assert.strictEqual(dappInterface, gelatoDutchX.address);
      assert.strictEqual(interfaceOrderId, orderId);
      assert.strictEqual(_sellToken, sellToken.address);
      assert.strictEqual(_buyToken, buyToken.address);
      assert.strictEqual(sellAmount, SUBORDER_SIZE_BN.toString());
      assert.strictEqual(_executionTime, executionTimes.toString());
      assert.strictEqual(prepaidExecutionFee, GDX_PREPAID_FEE_BN.toString());

      executionTimes += INTERVAL_SPAN;
    }

    // Log the execution Claim Ids:
    console.log(
      `\n\t\t Execution Claim IDs for gdx-truffle-execute: ${executionClaimIds}\n`
    );
  });
  // ******** Minted execution claims on Core END ********
});
// ********************* SPLITSELLORDER -> MINT_CLAIMS END *********************

// Helpers
// Wrapper function to run shell scripts from inside node.js
/**
 * Executes a shell command and return it as a Promise.
 * @param cmd {string}
 * @return {Promise<string>}
 */
function execShellCommand(cmd) {
  const exec = require("child_process").exec;
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      }
      resolve(stdout ? stdout : stderr);
    });
  });
}

// Unexpected results
// ********************* DUTCHX AUCTION STATE CHECKS *********************
/*describe("Gelato's DutchX auction state checks", () => {
  it("dutchExchange auctionIndex is at 2", async () => {
    console.log(
      `
       gelatoCore: ${gelatoCore.address}
       gelatoDX:   ${gelatoDutchX.address}
       dutchX:     ${dutchExchange.address}
      `
    );
    let auctionIndex = await dutchExchange.contract.methods
      .latestAuctionIndices(sellToken.address, buyToken.address)
      .call();
    assert.strictEqual(
      auctionIndex,
      "2",
      `auctionIndex should not be at 2, not ${auctionIndex}`
    );
  });
  it(`GELATO_DUTCHX orderId: 1 has lastAuctionIndex at 0`, async () => {
    let { lastAuctionIndex } = await gelatoDutchX.contract.methods
      .orderStates(orderId)
      .call();
    assert.strictEqual(lastAuctionIndex, "0");
  });
});*/
// ********************* DUTCHX AUCTION STATE CHECKS ********************

// Deprecated full integration test with execution
// ********************* GO TO FIRST EXEC TIME *********************
// DutchX Auction Time Logic
/* describe("Shell script to close Auction1", function() {
  this.timeout(20000);
  it("closes auction 1", async () => {
    let output = await execShellCommand("yarn gdx-close-auction-1");

    assert.exists(output);
    console.log("\n", output);
  });
});*/
// ********************* GO TO FIRST EXEC TIME END *********************

// ********************* EXECUTE *********************
// Call execute test file with each execution claim id
/* describe("ExecutionClaim # calls to gdx_truffle_execute.js", function() {
  this.timeout(200000);
  it("calls gdx_truffle_execute.execute(executionClaimId) with all executionClaimIds", async () => {
    let output;
    for (executionClaimId of executionClaimIds) {
      output = await execShellCommand(
        `export EXECUTIONCLAIM_ID=${executionClaimId}; yarn gdx-truffle-execute`
      );
      console.log("\n", output, "\n");
    }
    assert.exists(output);
  });
});*/

// ********************* EXECUTE *********************
