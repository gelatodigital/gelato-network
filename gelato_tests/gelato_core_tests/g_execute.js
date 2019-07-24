/* Gelato createSellOrder script
    @dev: Terminal command to run this script:
    Terminal window 1: watch this for stdout from GelatoCore and GELATO_DX
    * yarn rpc
    Terminal window 2: watch this for stdout from createSellOrder.js file.
    * yarn setup
    * truffle exec ./createSellOrder.js
*/
let accounts;
const SELLER = "0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef"; // accounts[2]:
const EXECUTOR = "0x821aEa9a577a9b44299B9c15c88cf3087F3b5544"; // accounts[3]
let seller; // account[2]
let executor; // accounts[3]
// Deployed contract instances
// Gelato
const GelatoCore = artifacts.require("GelatoCore");
const GELATO_CORE = "0x74e3FC764c2474f25369B9d021b7F92e8441A2Dc";
let gelatoCore;

const GelatoDutchX = artifacts.require("GelatoDutchX");
const GELATO_DX = "0x98d9f9e8DEbd4A632682ba207670d2a5ACD3c489";
let gelatoDutchX;

// DutchX
const DutchExchange = artifacts.require("DutchExchange");
const DUTCH_EXCHANGE = "0x3d49d1eF2adE060a33c6E6Aa213513A7EE9a6241";
let dutchExchange;

const SellToken = artifacts.require("EtherToken");
const SELL_TOKEN = "0xf204a4Ef082f5c04bB89F7D5E6568B796096735a"; // WETH
let sellToken;

const BuyToken = artifacts.require("TokenRDN");
const BUY_TOKEN = "0xF328c11c4dF88d18FcBd30ad38d8B4714F4b33bF"; // RDN
let buyToken;
// ********** Truffle/web3 setup EN ********

// For testing
const assert = require("assert");

// Big Number stuff
const BN = web3.utils.BN;

// GELATO_DX specific
const SUBORDER_SIZE_BN = new BN(web3.utils.toWei("10", "ether")); // 10 WETH

// Print commandline args to stdout
console.log(`process.argv[0]: ${process.argv[0]}`);
console.log(`process.argv[1]: ${process.argv[1]}`);
console.log(`process.argv[2]: ${process.argv[2]}`);
console.log(`process.argv[3]: ${process.argv[3]}`);
console.log(`
    ==================================================
`);
console.log(`process.argv[4]: ${process.argv[4]}`);

// Gelato-Core specific
// Constants
// 3 claims minted due to 2 subOrders + lastWithdrawal (3 subOrders)
const NUM_EXECUTIONCLAIMS = 3;
// Passed to script via variable export
const INDEX = process.argv[4]; // to get the right ExecutionClaimId
const SELL_AMOUNT_BN = SUBORDER_SIZE_BN;
const GELATO_GAS_PRICE_BN = new BN(web3.utils.toWei("5", "gwei"));
const GDX_MAXGAS_BN = new BN("400000"); // 400.000 must be benchmarked
const GDX_PREPAID_FEE_BN = GDXSSAW_MAXGAS_BN.mul(GELATO_GAS_PRICE_BN); // wei

// State shared across the unit tests
// tx returned data
let txHash;
let txReceipt;
let blockNumber;
// block data
let block; // e.g. getBlock(blockNumber).timstamp
let timestamp;

// Prior to GelatoCore.execute():
// Variable imports from for the splitSellOrder.js
const splitSellOrder =
  "../gelato_interface_tests/gelato_DutchX_tests/gDX_tests/gDX_functionalTests/gDX_splitSellOrder.js";
const { executionClaimIds, interfaceOrderId } = require(splitSellOrder);
// Test the importated variables
assert.equal(executionClaimIds.length, NUM_EXECUTIONCLAIMS);

// Post GelatoCore.execute():
let orderState;

console.log("HEERE");

module.exports = () => {
  async function testExecute() {
    // ********* get deployed instances ********
    // accounts
    accounts = await web3.eth.getAccounts();
    seller = accounts[2];
    executor = accounts[3];
    assert.strictEqual(seller, SELLER, "Seller account problem");
    assert.strictEqual(executor, EXECUTOR, "Executor account problem");

    // get Gelato instances
    gelatoCore = await GelatoCore.deployed();
    gelatoDutchX = await GelatoDutchX.deployed();

    // get DutchX instances
    dutchExchange = await DutchExchange.deployed();
    sellToken = await SellToken.deployed();
    buyToken = await BuyToken.deployed();

    // Gelato
    assert.strictEqual(
      gelatoCore.address,
      GelatoCore.address,
      "gelatoCore address problem"
    );
    assert.strictEqual(
      gelatoDutchX.address,
      GelatoDutchX.address,
      "gelatoDutchX address problem"
    );
    // Test variable imported from splitSellOrderId)
    assert.strictEqual(interfaceOrderId, gelatoDutchX.address);

    // DutchX
    assert.strictEqual(
      dutchExchange.address,
      DutchExchange.address,
      "dutchX address problem"
    );
    assert.strictEqual(
      sellToken.address,
      SELL_TOKEN,
      "sellToken address problem"
    );
    assert.strictEqual(buyToken.address, BUY_TOKEN, "buyToken address problem");
    // ********* get deployed instances END ********

    // ********************* DUTCHX AUCTION STATE CHECKS *********************
    console.log(
      `
            gelatoCore: ${gelatoCore.address}
            gdxssaw:    ${gelatoDutchX.address}
            dutchX:     ${dutchExchange.address}
      `
    );
    let auctionIndex = await dutchExchange.contract.methods
      .latestAuctionIndices(sellToken.address, buyToken.address)
      .call();
    console.log(`\t\t DutchX auctionIndex is at: ${auctionIndex}`);
    // ********************* DUTCHX AUCTION STATE CHECKS *********************

    // ********************* EXECUTE *********************
    // ******** GelatoCore.execute() gasUsed estimates ********
    // Get and log estimated gasUsed by splitSellOrder fn
    gelatoCore.contract.methods.execute(EXECUTION_CLAIM_ID).estimateGas(
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
          console.log(`\t\tgasLimit:           ${parseInt(block.gasLimit)}`);
          console.log(`\t\testimated gasUsed:   ${estimatedGasUsed}`);
        }
      }
    );
    // ******** GelatoCore.execute() gasUsed estimates END ********

    // ******** Executor calls GelatoCore.execute() and gets payout ********
    // we fetch data from the executionClaim to be executed
    let {
      executionClaimOwner,
      dappInterface,
      interfaceOrderId: _interfaceOrderId,
      sellToken: _sellToken,
      buyToken: _buyToken,
      sellAmount,
      executionTime,
      prepaidExecutionFee
    } = await gelatoCore.contract.methods
      .getExecutionClaim(executionClaimIds[INDEX])
      .call();

    // Fetch current timestamp
    blockNumber = await web3.eth.getBlockNumber();
    block = await web3.eth.getBlock(blockNumber);
    timestamp = block.timestamp;

    // we check the fetched executionClaim data
    assert.strictEqual(executionClaimOwner, SELLER);
    assert.strictEqual(dappInterface, gelatoDutchX.address);
    assert.strictEqual(_interfaceOrderId, interfaceOrderId);
    assert.strictEqual(_sellToken, sellToken.address);
    assert.strictEqual(_buyToken, buyToken.address);
    assert.strictEqual(sellAmount, SELL_AMOUNT_BN.toString());
    assert(parseInt(executionTime) <= timestamp);
    assert.strictEqual(prepaidExecutionFee, GDX_PREPAID_FEE_BN.toString());

    // ********** EXECUE CALL and EXECUTOR PAYOUT Checks **********
    // get executor's balance pre executionClaim minting
    let executorBalancePre = new BN(await web3.eth.getBalance(executor));

    // executor calls gelatoCore.execute(executionClaimId)
    console.log(
      `\n\t\t EXECUTING EXECUTION_CLAIM_ID: ${executionClaimIds[INDEX]}\n`
    );
    // benchmarked gasUsed =
    await gelatoCore.contract.methods
      .execute(executionClaimIds[INDEX]) // executionClaimId: 1
      .send({ from: executor, gas: 1000000 }) // gas needed to prevent out of gas error
      .once("transactionHash", hash => (txHash = hash))
      .once("receipt", receipt => (txReceipt = receipt))
      .on("error", console.error);

    // Log actual gasUsed
    console.log("\t\tactual gasUsed:     ", txReceipt.gasUsed);

    // Check that executor's balance has gone up by prepaidExecutionFee
    let executorBalancePost = new BN(await web3.eth.getBalance(executor));
    assert.strictEqual(
      executorBalancePost.toString(),
      executorBalancePre.add(prepaidExecutionFee).toString()
    );
    console.log(
      `\n\t\t EXECUTOR BALANCE ETH PRE:  ${web3.utils.fromWei(
        executorBalancePre.toString(),
        "ether"
      )}\n`
    );
    console.log(
      `\n\t\t EXECUTOR BALANCE ETH POST: ${web3.utils.fromWei(
        executorBalancePost.toString(),
        "ether"
      )}\n`
    );
    // ********** EXECUTE CALL and EXECUTOR PAYOUT Checks **********

    // ********** LogClaimExecutedAndDeleted Event Checks **********
    // emitted event on GelatoCore: LogClaimExecutedAndDeleted(dappInterface, executor, executionClaimId, executorPayout)
    console.log(
      "LogClaimExecutedAndDeleted:\n",
      txReceipt.events.LogClaimExecutedAndDeleted
    );
    assert.ok(txReceipt.events.LogClaimExecutedAndDeleted);
    // check if event has correct return values
    assert.strictEqual(
      txReceipt.events.LogClaimExecutedAndDeleted.returnValues.dappInterface,
      gelatoDutchX.address
    );
    assert.strictEqual(
      txReceipt.events.LogClaimExecutedAndDeleted.returnValues.executor,
      executor
    );
    assert.strictEqual(
      txReceipt.events.LogClaimExecutedAndDeleted.returnValues.executionClaimId,
      executionClaimIds[INDEX]
    );
    assert.strictEqual(
      txReceipt.events.LogClaimExecutedAndDeleted.returnValues
        .gelatoCorePayable,
      prepaidExecutionFee
    );
    // ********** LogClaimExecutedAndDeleted Event Checks END **********

    // save the executionClaimId
    executionClaimId =
      txReceipt.events.LogClaimExecutedAndDeleted.returnValues.executionClaimId;

    // make sure executionClaim was burnt
    orderState = await gelatoDutchX.contract.methods
      .orderStates(interfaceOrderId)
      .call();

    // check the orderState
    assert.isFalse(orderState.lastAuctionWasWaiting);
    assert.strictEqual(orderState.lastAuctionIndex, "0");
    assert.strictEqual(orderState.remainingSubOrders, NUM_SUBORDERS_BN);
    assert.strictEqual(orderState.lastSellAmountAfterFee, "0");
    assert.strictEqual(orderState.remainingWithdrawals, NUM_SUBORDERS_BN);

    // Save transactions blockNumber for tests on GELATO_DUTCHX
    blockNumber = txReceipt.blockNumber;
    // ******** Executor calls gelatoCore.execute() and gets payout END ********

    // ******** Execution Claim burned check  ********
    // ******** Execution Claim burned check  END ********
  }

  // run the test
  testExecute().then(result => console.log(result));
};
