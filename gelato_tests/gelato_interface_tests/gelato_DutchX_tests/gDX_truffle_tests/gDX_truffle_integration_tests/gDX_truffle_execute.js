/** Truffle Test (mocha-chai): automated integration test for GelatoDxSplitSellAndWithdraw
 * default test suite
 *
 * GelatoDutchX.splitSellOrder() covers:
 * -----------------------------------------------------
 * -> GelatoCore.mintClaim()
 * -----------------------------------------------------
 *  */
// ********** Truffle/web3 setup ********
let accounts;
const SELLER = "0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef"; // accounts[2]:
let seller; // account[2]
const EXECUTION_CLAIM_OWNER = SELLER;
const EXECUTOR = "0x821aEa9a577a9b44299B9c15c88cf3087F3b5544"; // accounts[3]
let executor; // accounts[3]

// Deployed contract instances
// Gelato
const GelatoCore = artifacts.require("GelatoCore");
let gelatoCore;

const GelatoDutchX = artifacts.require("GelatoDutchX");
let gelatoDutchX;

// DutchX
const DutchExchange = artifacts.require("DutchExchange");
let dutchExchange;

const SellToken = artifacts.require("EtherToken");
const SELL_TOKEN = "0xAa588d3737B611baFD7bD713445b314BD453a5C8"; // WETH
let sellToken;

const BuyToken = artifacts.require("TokenRDN");
const BUY_TOKEN = "0x8ACEe021a27779d8E98B9650722676B850b25E11"; // RDN
let buyToken;
// ********** Truffle/web3 setup EN ********

// Big Number stuff
const BN = web3.utils.BN;

// Gelato-Core specific
// Constants
// GELATO_GAS_PRICE:
//  This is a state variable that got deployed with truffle migrate
//  and was set inside 3_deploy_gelato.js. We should import this variable
//  instead of hardcoding it.
//  It should match the truffle.js specified DEFAULT_GAS_PRICE_GWEI = 5
const GELATO_GAS_PRICE_BN = new BN(web3.utils.toWei("5", "gwei"));
const GDX_MAXGAS_BN = new BN("400000"); // 400.000 must be benchmarked
const GDX_PREPAID_FEE_BN = GDX_MAXGAS_BN.mul(GELATO_GAS_PRICE_BN); // wei

// GELATO_DUTCHX specific
const TOTAL_SELL_VOLUME = web3.utils.toWei("20", "ether"); // 20 WETH
const NUM_SUBORDERS_BN = new BN("2");
const NUM_EXECUTIONCLAIMS_BN = new BN("3"); // NUM_SUBORDERS + lastWithdrawal
const SUBORDER_SIZE_BN = new BN(web3.utils.toWei("10", "ether")); // 10 WETH
const INTERVAL_SPAN = 21600; // 6 hours
// PREPAYMENT_BN needs .add(1) in GELATO_DUTCHX due to offset of last withdrawal executionClaim
const PREPAYMENT_BN = GDX_PREPAID_FEE_BN.mul(NUM_EXECUTIONCLAIMS_BN); // wei

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
let index = 0;

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


// ********************* EXECUTE *********************
// Test suite to end-to-end test the EXECUTION of a GELATO_DUTCHX style claim
describe("gelatoCore.execute() -> GELATO_DUTCHX.execute() -> burnExecutionClaim and executorPayout", async () => {
  // ******** GelatoCore.execute() gasUsed estimates ********
  it(`estimates GelatoCore.execute() gasUsed and logs gasLimit`, async () => {
    // Get and log estimated gasUsed by splitSellOrder fn
    gelatoCore.contract.methods.execute(executionClaimIds[index]).estimateGas(
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
      .getExecutionClaim(executionClaimIds[index])
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
    let executorBalancePre = new BN(await web3.eth.getBalance(executor));

    // executor calls gelatoCore.execute(executionClaimId)
    // benchmarked gasUsed =
    function execute() {
      return new Promise(async (resolve, reject) => {
        await gelatoCore.contract.methods
          .execute(executionClaimIds[index])
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
      `\n\t\t EXECUTED EXECUTION_CLAIM_ID: ${executionClaimIds[index]}\n`
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
        assert.strictEqual(
          events[0].returnValues.from,
          EXECUTION_CLAIM_OWNER
        );
        assert.strictEqual(
          events[0].returnValues.to,
          "0x0000000000000000000000000000000000000000"
        );
        assert.strictEqual(
          events[0].returnValues.tokenId,
          executionClaimIds[index]
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
      await GelatoCore.contract.methods
        .ownerOf(executionClaimIds[index])
        .call();
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
        .getClaimInterface(executionClaimIds[index])
        .call();
      // This test should fail
      assert.fail(
        "GelatoCore bug: should not allow specific call deleted executionClaim struct"
      );
    } catch (err) {
      console.log(
        `ExecutionClaim with id ${executionClaimIds[index]} deleted`
      );
      assert(err);
    }
  });
  // ******** Execution Claim struct deleted on Gelato Core END ********

  // ********************* SHELL SCRIPTS -> DUTCHX MANIPULATION *********************
  // DutchX Auction Time Logic
  it("skips to next execution time", async function() {
    this.timeout(30000);
    let output = await execShellCommand("yarn gdx-to-next-exec-time");

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
