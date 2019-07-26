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
const EXECUTION_CLAIM_OWNER = gdxConfig.EXECUTION_CLAIM_OWNER;
const EXECUTOR = gdxConfig.EXECUTOR; // accounts[3]
let executor; // accounts[3]

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
// Prior to GelatoCore.listInterface:
let gelatoCoreOwner; // accounts[0]
let gelatoDXOwner; // accounts[0]

// Prior to GELATO_DUTCHX.splitSellOrder():
let executionTime; // timestamp

// Post GELATO_DUTCHX.splitSellOrder():
let orderId;
let orderState;
let executionClaimIds = [];

// Pre GelatoCore.execute():

// Post GelatoCore.execute():
let executedClaimId;

// Default test suite
describe("default test suite: correct deployed instances and owners", () => {
  // suite root-level pre-hook: set the test suite variables to be shared among all tests
  before(async () => {
    // accounts
    accounts = await web3.eth.getAccounts();
    seller = accounts[2];
    executor = accounts[3];

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
    assert.strictEqual(executor, EXECUTOR);
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

/* describe("Endowing seller with 20 WETH", function() {
  this.timeout(30000);
  it("endows seller with 20 WETH", async () => {
    let output = await execShellCommand('yarn es');

    assert.exists(output);
    console.log("\n", output);
  })
})*/

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
  });
  // ******** Event on core LogNewInterfaceListed END ********
});

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
  it(`GELATO_DUTCHX.splitSellOrder() works with correct msg.value received on Core and LogNewOrderCreated event`, async () => {
    // First get gelatoCore's balance pre executionClaim minting
    let gelatoCoreBalancePre = new BN(
      await web3.eth.getBalance(gelatoCore.address)
    );
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
    let gelatoCoreBalancePost = new BN(
      await web3.eth.getBalance(gelatoCore.address)
    );
    /*assert.strictEqual(
      gelatoCoreBalancePost.toString(),
      gelatoCoreBalancePre.add(PREPAYMENT_BN).toString()
    );*/

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
  });
  // ******** Minted execution claims on Core END ********
});
// ********************* SPLITSELLORDER -> MINT_CLAIMS END *********************

// ********************* SHELL SCRIPTS -> DUTCHX MANIPULATION *********************
// DutchX Auction Time Logic
describe("Shell script to close Auction1", function() {
  this.timeout(20000);
  it("closes auction 1", async () => {
    let output = await execShellCommand("yarn gdx-close-auction-1");

    assert.exists(output);
    console.log("\n", output);
  });
});
// ********************* SHELL SCRIPTS -> DUTCHX MANIPULATION END *********************

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
// ********************* DUTCHX AUCTION STATE CHECKS *********************

// ********************* EXECUTE *********************
// Test suite to end-to-end test the EXECUTION of a GELATO_DUTCHX style claim
describe("gelatoCore.execute() -> GELATO_DUTCHX.execute() -> burnExecutionClaim and executorPayout", async () => {
  // ******** GelatoCore.execute() gasUsed estimates ********
  it(`estimates GelatoCore.execute() gasUsed and logs gasLimit`, async () => {
    // Get and log estimated gasUsed by splitSellOrder fn
    gelatoCore.contract.methods.execute(executionClaimIds[0]).estimateGas(
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

  // ******** Recursive end-to-end GelatoCore.execute() test suite ********
  it(`gelatoCore.execute(1) results in correct executor payout`, async () => {
    // ********** EXECUTE CALL and EXECUTOR PAYOUT Checks **********
    // we fetch data from the executionClaim to be executed
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
      .getExecutionClaim(executionClaimIds[0])
      .call();

    // Fetch current timestamp
    blockNumber = await web3.eth.getBlockNumber();
    block = await web3.eth.getBlock(blockNumber);
    timestamp = block.timestamp;

    // we check the fetched executionClaim data
    assert.strictEqual(executionClaimOwner, EXECUTION_CLAIM_OWNER);
    assert.strictEqual(dappInterface, gelatoDutchX.address);
    assert.strictEqual(interfaceOrderId, orderId);
    assert.strictEqual(_sellToken, sellToken.address);
    assert.strictEqual(_buyToken, buyToken.address);
    assert.strictEqual(sellAmount, SUBORDER_SIZE_BN.toString());
    assert(parseInt(_executionTime) <= timestamp);
    assert.strictEqual(prepaidExecutionFee, GDX_PREPAID_FEE_BN.toString());

    // get executor's balance pre executionClaim minting
    let executorBalancePre = new BN(await web3.eth.getBalance(executor).toString());

    // executor calls gelatoCore.execute(executionClaimId)
    // benchmarked gasUsed =
    function execute() {
      return new Promise(async (resolve, reject) => {
        await gelatoCore.contract.methods
          .execute(executionClaimIds[0])
          .send({ from: executor, gas: 1000000 }, (error, hash) => {
            if (error) {
              reject(error);
            }
            resolve(hash);
          }); // gas needed to prevent out of gas error
      });
    }
    // call execute() and get hash from callback
    txHash = await execute();

    // get txReceipt with executeTx hash
    txReceipt;
    await web3.eth.getTransactionReceipt(txHash, (error, result) => {
      if (error) {
        console.error;
      }
      txReceipt = result;
    });
    // Log actual gasUsed
    console.log(`\n\t\tactual gasUsed:     ${parseInt(txReceipt.gasUsed)}`);
    console.log(
      `\n\t\t EXECUTED EXECUTION_CLAIM_ID: ${executionClaimIds[0]}\n`
    );
    console.log(`\tExecute TxHash: ${txHash}\n`);

    // Check that executor's balance has gone up by prepaidExecutionFee
    let executorBalancePost = new BN(await web3.eth.getBalance(executor));

    /*console.log(
      `\n\t\t Expected ExecutorBalancePost: ${executorBalancePre
        .add(prepaidExecutionFee)
        .sub(txReceipt.gasUsed)}`
    );
    assert.strictEqual(
      executorBalancePost.toString(),
      executorBalancePre
        .add(prepaidExecutionFee)
        .sub(txReceipt.gasUsed)
        .toString()
    );*/

    console.log(
      `\n\t\t EXECUTOR BALANCE ETH PRE:  ${web3.utils.fromWei(
        executorBalancePre.toString(),
        "ether"
      )} ETH\n`
    );
    console.log(
      `\n\t\t EXECUTOR PAYOUT: \t\t\t ${web3.utils.fromWei(
        GDX_PREPAID_FEE_BN.toString(),
        "ether"
      )} ETH\n`
    );
    console.log(
      `\n\t\t EXECUTOR BALANCE ETH POST: ${web3.utils.fromWei(
        executorBalancePost.toString(),
        "ether"
      )} ETH \n`
    );
    // ********** EXECUTE CALL and EXECUTOR PAYOUT Checks END **********

    // Save transactions blockNumber for next event emission test;
    blockNumber = txReceipt.blockNumber;
  });

  // ******** Event LogClaimExecutedBurnedAndDeleted on gelatoCore ********
  it(`gelatoCore.execute(1) results in correct LogClaimExecutedAndDeleted`, async () => {
    let _event;
    await gelatoCore.getPastEvents(
      "LogClaimExecutedBurnedAndDeleted",
      (error, events) => {
        if (error) {
          console.error(
            "errored during gelatoCore.getPastEvent(LogClaimExecutedBurnedAndDeleted)"
          );
        } else {
          // Event data checks
          assert.strictEqual(
            events[0].event,
            "LogClaimExecutedBurnedAndDeleted"
          );
          assert.strictEqual(
            events[0].blockNumber,
            blockNumber,
            "LogClaimExecutedBurnedAndDeleted blocknumber problem"
          );
          assert.strictEqual(
            events[0].returnValues.dappInterface,
            gelatoDutchX.address,
            "LogClaimExecutedBurnedAndDeleted dappInterface problem"
          );
          assert.strictEqual(
            events[0].returnValues.executor,
            executor,
            "LogClaimExecutedBurnedAndDeleted executor problem"
          );
          assert.strictEqual(
            events[0].returnValues.executionClaimOwner,
            EXECUTION_CLAIM_OWNER,
            "LogClaimExecutedBurnedAndDeleted executionClaimOwner problem"
          );
          assert.strictEqual(
            events[0].returnValues.gelatoCorePayable,
            GDX_PREPAID_FEE_BN.toString(),
            "LogClaimExecutedBurnedAndDeleted gelatoCorePayable problem"
          );

          // Log the event return values
          console.log(
            "\n\tLogClaimExecutedBurnedAndDeleted Event Return Values:\n\t",
            events[0].returnValues,
            "\n"
          );
          // Hold on to event for next assert.ok
          _event = events[0];
        }
      }
    );
    // Make sure event were emitted
    assert.exists(
      _event,
      "LogClaimExecutedBurnedAndDeleted _event do not exist"
    );
  });
  // ******** Event LogClaimExecutedBurnedAndDeleted on gelatoCore END ********

  // ******** Event (Transfer) Execution Claim burned check  ********
  it(`gelatoCore.execute(1) results in correct ExecutionClaim ERC721 burn Transfer event`, async () => {
    // emitted event on GelatoCore via Claim base: Transfer(owner, address(0), tokenId)
    let _event;
    await gelatoCore.getPastEvents("Transfer", (error, events) => {
      if (error) {
        console.error("errored during gelatoCore.getPastEvent(Transfer)");
      } else {
        // Event data checks
        assert.strictEqual(events[0].event, "Transfer");
        assert.strictEqual(
          events[0].blockNumber,
          blockNumber,
          "Transfer blocknumber problem"
        );
        // check if event has correct return values
        assert.strictEqual(events[0].returnValues.from, EXECUTION_CLAIM_OWNER);
        assert.strictEqual(
          events[0].returnValues.to,
          "0x0000000000000000000000000000000000000000"
        );
        assert.strictEqual(
          events[0].returnValues.tokenId,
          executionClaimIds[0]
        );

        // Log the event return values
        console.log(
          "\nTransfer Event Return Values:\n\t",
          events[0].returnValues,
          "\n"
        );
        // Hold on to event for next assert.ok
        _event = events[0];
      }
    });
    // Make sure event were emitted
    assert.exists(_event, "Transfer _event do not exist");
  });
  // ******** Event (Transfer) Execution Claim burned check END ********

  // ******** ERC721 Claim.sol burned check ********
  it(`gelatoCore.execute(1) results in ERC721 burn on GelatoCore's Claim base contract`, async () => {
    try {
      await GelatoCore.contract.methods.ownerOf(executionClaimIds[0]).call();
      // This test should fail
      assert.fail(
        "GelatoCore base contract (Claim.sol) bug: should not allow call to ownerOf with deleted executionClaimId"
      );
    } catch (err) {
      assert(err);
    }
  });
  // ******** ERC721 Claim.sol burned check END ********

  // ******** Execution Claim struct deleted on Gelato Core  ********
  it(`gelatoCore.execute(1) results in executionClaims(executionClaimId) struct deletion on GelatoCore`, async () => {
    try {
      await GelatoCore.contract.methods
        .getClaimInterface(executionClaimIds[0])
        .call();
      // This test should fail
      assert.fail(
        "GelatoCore bug: should not allow specific call deleted executionClaim struct"
      );
    } catch (err) {
      console.log(`ExecutionClaim with id ${executionClaimIds[0]} deleted`);
      assert(err);
    }
  });
  // ******** Execution Claim struct deleted on Gelato Core END ********

  // ********************* SHELL SCRIPTS -> DUTCHX MANIPULATION *********************
  // DutchX Auction Time Logic
  it("skips to next execution time", async function() {
    this.timeout(50000);
    let output = await execShellCommand("yarn gdx-to-next-exec-time");
    output = await execShellCommand("yarn gdx-state");

    assert.exists(output);
    console.log("\n\n", output, "\n\n");
  });
  // ********************* SHELL SCRIPTS -> DUTCHX MANIPULATION END *********************

  // make sure orderState was deleted on GelatoDutchX
  /*it(`gelatoCore.execute(1) results in orderStates(orderId) struct deletion on GelatoDutchX`, async () => {
    orderState = await gelatoDutchX.contract.methods
      .orderStates(orderId)
      .call();
    // check the orderState: should be zeroed out via solidity delete
    assert.strictEqual(orderState.lastAuctionWasWaiting, "0");
    assert.strictEqual(orderState.lastAuctionIndex, "0");
    assert.strictEqual(orderState.remainingSubOrders, "0");
    assert.strictEqual(orderState.lastSellAmountAfterFee, "0");
    assert.strictEqual(orderState.remainingWithdrawals, "0");
  });*/
}); // DESCRIBE BLOCK END
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
