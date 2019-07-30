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

const EXECUTIONCLAIM_ID = process.env.ID;
console.log("EXECUTIONCLAIM_ID: ", process.env.ID);

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
const BUY_TOKEN = gdxConfig.BUY_TOKEN_STRING;
let buyToken;
// ********** Truffle/web3 setup EN ********

// NETWORK VARIABLES
const GAS_PRICE = gdxConfig.GAS_PRICE;

// GELATO_DUTCHX specific
// MaxGas
const GDX_MAXGAS_BN = gdxConfig.GDX_MAXGAS_BN;
// PREPAID FEE per GDX execClaim and total PREPAYMENT
const GDX_PREPAID_FEE_BN = gdxConfig.GDX_PREPAID_FEE_BN;
const SUBORDER_SIZE_BN = gdxConfig.SUBORDER_SIZE_BN;

// State shared across the unit tests
// tx returned data
let txHash;
let txReceipt;
let blockNumber;
// block data
let block; // e.g. getBlock(blockNumber).timstamp
let timestamp;

// Pre GelatoCore.execute():
let interfaceOrderId;

// Post GelatoCore.execute():

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
});

// ********************* EXECUTE *********************
// Test suite to end-to-end test the EXECUTION of a GELATO_DUTCHX style claim
describe("gelatoCore.execute() -> GELATO_DUTCHX.execute() -> burnExecutionClaim and executorPayout", async () => {
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
          await web3.eth.getBlock("latest", false, (error, _block) => {
            if (error) {
              console.error;
            } else {
              block = _block;
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
  it(`gelatoCore.execute(ID) results in correct seller and executor payouts`, async () => {
    // ********** EXECUTE and PAYOUT CHECKS **********
    // we fetch data from the executionClaim to be executed
    let {
      executionClaimOwner,
      dappInterface,
      interfaceOrderId: _interfaceOrderId,
      sellToken: _sellToken,
      buyToken: _buyToken,
      sellAmount,
      executionTime: _executionTime,
      prepaidExecutionFee
    } = await gelatoCore.contract.methods
      .getExecutionClaim(EXECUTIONCLAIM_ID)
      .call();

    // Save the interface Order Id
    interfaceOrderId = _interfaceOrderId;

    // Fetch current timestamp
    blockNumber = await web3.eth.getBlockNumber();
    block = await web3.eth.getBlock(blockNumber);
    timestamp = block.timestamp;

    // we check the fetched executionClaim data
    assert.strictEqual(executionClaimOwner, EXECUTION_CLAIM_OWNER);
    assert.strictEqual(dappInterface, gelatoDutchX.address);
    assert.strictEqual(_sellToken, sellToken.address);
    assert.strictEqual(_buyToken, buyToken.address);
    assert.strictEqual(sellAmount, SUBORDER_SIZE_BN.toString());
    assert(parseInt(_executionTime) <= timestamp);
    assert.strictEqual(prepaidExecutionFee, GDX_PREPAID_FEE_BN.toString());

    // Fetch Executor Before balance
    let executorBalancePreExec = await web3.eth.getBalance(executor);
    executorBalancePreExec = new BN(executorBalancePreExec);

    // Fetch Seller Before ERC20 BUY_TOKEN balance
    let buyTokenBalanceBefore = await buyToken.contract.methods
      .balanceOf(seller)
      .call();

    // executor calls gelatoCore.execute(executionClaimId)
    // benchmarked gasUsed =
    function execute() {
      return new Promise(async (resolve, reject) => {
        await gelatoCore.contract.methods
          .execute(EXECUTIONCLAIM_ID)
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

    // Get gasUsed and GasCost
    const gasUsed = new BN(txReceipt.gasUsed.toString());
    const gasPriceBN = new BN(GAS_PRICE);
    let gasCost = gasUsed.mul(gasPriceBN);

    // Log actual gasUsed
    console.log(`\t\tactual gasUsed:      ${gasUsed}`);
    // Log MaxGas
    console.log(`\t\tGDX MaxGas:          ${GDX_MAXGAS_BN}`);

    // Log the txHash
    console.log(`\n\tExecute TxHash: ${txHash}\n`);

    // Check that executor's balance has gone up by prepaidExecutionFee
    let executorBalancePostExec = await web3.eth.getBalance(executor);
    executorBalancePostExec = new BN(executorBalancePostExec);
    const executorTradeBalance = executorBalancePostExec.sub(
      executorBalancePreExec
    );

    console.log(`gasUsed:                    ${gasUsed}`);
    console.log(`gasPrice:                   ${GAS_PRICE}`);

    console.log(`gasCost:                    ${gasCost}`);
    console.log(
      `gasCostFinney               ${web3.utils.fromWei(
        gasCost,
        "finney"
      )} finney`
    );

    console.log(`executorBalancePostExec:    ${executorBalancePostExec}`);
    console.log(
      `executorBalancePostExec:    ${web3.utils.fromWei(
        executorBalancePostExec,
        "finney"
      )} finney`
    );
    console.log(
      `executorBalancePreExec:     ${web3.utils.fromWei(
        executorBalancePreExec,
        "finney"
      )} finney`
    );

    console.log(`executorTradeBalance:       ${executorTradeBalance}`);
    console.log(
      `executorTradeBalanceFinney: ${web3.utils.fromWei(
        executorTradeBalance,
        "finney"
      )} finney`
    );

    // Executor Profit and Loss Statement
    console.log(`
                        Executor Account Info BEFORE subOrder execution:
                        ------------------------------------------------
        Executor Account:         ${executor}
        Executor Account Balance
            BEFORE execution: > ${web3.utils.fromWei(
              executorBalancePreExec,
              "finney"
            )} finney  |
            AFTER execution:  > ${web3.utils.fromWei(
              executorBalancePostExec,
              "finney"
            )} finney |

                        Executor Profit/Loss Statement:
                        --------------------------------
        Assumption: executor did not receive any ether from elsewhere since execution.
        Executor reward
        per sub order:                   +${web3.utils.fromWei(
          prepaidExecutionFee,
          "finney"
        )} finney
        Executor gas cost:               -${web3.utils.fromWei(
          gasCost,
          "finney"
        )} finney
        -----------------------------------------------------
        Executor trade profit/deficit:    ${web3.utils.fromWei(
          executorTradeBalance,
          "finney"
        )} finney
                                        ---------------------
    ==================================================
    `);

    // ********* SELLER WITHDRAWAL CHECKS ***********
    // Comparing the BUY_TOKEN Balance before and after
    const buyTokenBalanceAfter = await buyToken.contract.methods
      .balanceOf(seller)
      .call();
    const buyTokenBalanceBeforeBN = new BN(buyTokenBalanceBefore);
    const buyTokenBalanceAfterBN = new BN(buyTokenBalanceAfter);
    // Calculate the difference before and after the exection
    const buyTokenBalanceDifference = buyTokenBalanceAfterBN.sub(
      buyTokenBalanceBeforeBN
    );

    console.log(
      `Sellers ${BUY_TOKEN} balance before:        ${buyTokenBalanceBefore /
        10 ** 18}`
    );
    console.log(
      `Sellers ${BUY_TOKEN} balance After:         ${buyTokenBalanceAfter /
        10 ** 18}`
    );
    console.log(
      `Sellers ${BUY_TOKEN} balance Difference:    ${buyTokenBalanceDifference /
        10 ** 18}`
    );
    // ********* SELLER WITHDRAWAL CHECKS END ***********

    // ********** EXECUTE and PAYOUT CHECKS END **********

    // Save transactions blockNumber for next event emission test;
    blockNumber = txReceipt.blockNumber;
  });

  // ******** Event LogClaimExecutedBurnedAndDeleted on gelatoCore ********
  it(`gelatoCore.execute(ID) results in correct LogClaimExecutedAndDeleted`, async () => {
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
            "\n\n\n\t\tLogClaimExecutedBurnedAndDeleted Event Return Values:\n",
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
  it(`gelatoCore.execute(ID) results in correct ExecutionClaim ERC721 burn Transfer event`, async () => {
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
        assert.strictEqual(events[0].returnValues.tokenId, EXECUTIONCLAIM_ID);

        // Log the event return values
        console.log(
          "\n\n\n\t\tTransfer Event Return Values:\n",
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
  it(`gelatoCore.execute(ID) results in ERC721 burn on GelatoCore's Claim base contract`, async () => {
    try {
      await gelatoCore.contract.methods.ownerOf(EXECUTIONCLAIM_ID).call();
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
  it(`gelatoCore.execute(ID) results in executionClaims(executionClaimId) struct deletion on GelatoCore`, async () => {
    try {
      await gelatoCore.contract.methods
        .getExecutionClaim(EXECUTIONCLAIM_ID)
        .call();
      // This test should fail
      assert.fail(
        "GelatoCore bug: should not allow call to deleted executionClaim struct"
      );
    } catch (err) {
      assert(err);
      console.log(`\n\t\t ExecutionClaim with id ${EXECUTIONCLAIM_ID} deleted`);
    }
  });
  // ******** Execution Claim struct deleted on Gelato Core END ********

  // ******** Order State struct deleted on Gelato Core with last execution ********
  it(`the LAST gelatoCore.execute(ID) results in orderStates(orderId) struct deletion on GelatoDutchX`, async () => {
    let orderState = await gelatoDutchX.contract.methods
      .orderStates(interfaceOrderId)
      .call();
    // If 0 remainingWithdrawals -> orderState should have been deleted
    if (orderState.remainingWithdrawals == "0") {
      // Event LogOrderCompletedAndDeleted
      let _event;
      await gelatoDutchX.getPastEvents(
        "LogOrderCompletedAndDeleted",
        (error, events) => {
          if (error) {
            console.error(
              "errored during gelatoDutchX.getPastEvent(LogOrderCompletedAndDeleted)"
            );
          } else {
            // Event data checks
            assert.strictEqual(events[0].event, "LogOrderCompletedAndDeleted");
            assert.strictEqual(
              events[0].blockNumber,
              blockNumber,
              "LogOrderCompletedAndDeleted blocknumber problem"
            );
            assert.strictEqual(
              events[0].returnValues.orderId,
              interfaceOrderId,
              "LogOrderCompletedAndDeleted orderId problem"
            );

            // Log the event return values
            console.log(
              "\n\n\n\t\t LogOrderCompletedAndDeleted Event Return Values:\n",
              events[0].returnValues,
              "\n"
            );
            // Hold on to event for next assert.ok
            _event = events[0];
          }
        }
      );
      // Make sure event were emitted
      assert.exists(_event, "LogOrderCompletedAndDeleted _event do not exist");
      console.log(
        `\t\t OrderState struct with interfaceOrderId ${interfaceOrderId} deleted`
      );
    } else {
      // Order State should always be non-zero unless deleted
      assert(true);
    }
  });
  // ******** Order State struct deleted on Gelato Core with last execution END ********
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

// Not used:
// ********************* TO NEXT EXEC TIME *********************
// DutchX Auction Time Logic
/*it("skips to next execution time", async function() {
    this.timeout(50000);
    let output = await execShellCommand("yarn gdx-to-next-exec-time");
    output = await execShellCommand("yarn gdx-state");

    assert.exists(output);
    console.log("\n\n", output, "\n\n");
  });*/
// ********************* TO NEXT EXEC TIM END *********************

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
// ********************* DUTCHX AUCTION STATE CHECKS *********************
