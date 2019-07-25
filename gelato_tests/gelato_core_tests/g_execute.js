/* Gelato createSellOrder script
    @dev: Terminal command to run this script:
    Terminal window 1: watch this for stdout from GelatoCore and GELATO_DX
    * yarn rpc
    Terminal window 2: watch this for stdout from g_execute.js file.
    * yarn setup
    * yarn gdx-to-first-exec-time
    * yarn gdx-exec <EXECUTION_CLAIM_ID>
*/
// The script schould be called with an index argument
console.log(`process.argv[0]: ${process.argv[0]}`);
console.log(`process.argv[1]: ${process.argv[1]}`);
console.log(`process.argv[2]: ${process.argv[2]}`);
console.log(`process.argv[3]: ${process.argv[3]}`);
console.log(`
    ==================================================
`);
console.log(`process.argv[4]-ExecutionClaimIDs Index: ${process.argv[4]}`);

// From command line arguments
const EXECUTION_CLAIM_ID = process.argv[4];

// Global scope
let accounts;
const SELLER = "0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef"; // accounts[2]:
const EXECUTION_CLAIM_OWNER = SELLER;
const EXECUTOR = "0x821aEa9a577a9b44299B9c15c88cf3087F3b5544"; // accounts[3]
let seller; // account[2]

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
let sellToken;

const BuyToken = artifacts.require("TokenRDN");
let buyToken;
// ********** Truffle/web3 setup EN ********

// For testing
const assert = require("assert");

// Big Number stuff
const BN = web3.utils.BN;

// GELATO_DX specific
const SUBORDER_SIZE_BN = new BN(web3.utils.toWei("10", "ether")); // 10 WETH

// Gelato-Core specific
// Constants
// 3 claims minted due to 2 subOrders + lastWithdrawal (3 subOrders)
const NUM_EXECUTIONCLAIMS = 3;
// Passed to script via variable export
const INDEX = process.argv[4]; // to get the right ExecutionClaimId
const SELL_AMOUNT_BN = SUBORDER_SIZE_BN;
const GELATO_GAS_PRICE_BN = new BN(web3.utils.toWei("5", "gwei"));
const GDX_MAXGAS_BN = new BN("400000"); // 400.000 must be benchmarked
const GDX_PREPAID_FEE_BN = GDX_MAXGAS_BN.mul(GELATO_GAS_PRICE_BN); // wei

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
let executedClaimId;
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
    // assert.strictEqual(interfaceOrderId, gelatoDutchX.address);

    // DutchX
    assert.strictEqual(
      dutchExchange.address,
      DutchExchange.address,
      "dutchX address problem"
    );
    assert.strictEqual(
      sellToken.address,
      SellToken.address,
      "sellToken address problem"
    );
    assert.strictEqual(
      buyToken.address,
      BuyToken.address,
      "buyToken address problem"
    );
    // ********* get deployed instances END ********

    console.log("HEEEREE 2");

    // ********************* DUTCHX AUCTION STATE CHECKS *********************
    let auctionIndex = await dutchExchange.contract.methods
      .latestAuctionIndices(sellToken.address, buyToken.address)
      .call();
    console.log(`\n\t\t DutchX auctionIndex is at: ${auctionIndex}\n`);
    // ********************* DUTCHX AUCTION STATE CHECKS *********************

    // ********************* EXECUTE *********************
    // ******** GelatoCore.execute() gasUsed estimates ********
    // Get and log estimated gasUsed by splitSellOrder fn
    gelatoCore.contract.methods.execute(EXECUTION_CLAIM_ID).estimateGas(
      { from: executor, gas: 1000000 }, // gas needed to prevent out of gas error
      async (error, estimatedGasUsed) => {
        if (error) {
          console.error(`.estimateGas error: ${error}`);
        } else {
          // Get and log gasLimit
          await web3.eth.getBlock("latest", false, (error, _block) => {
            if (error) {
              console.error(`getBlock error: ${error}`);
            } else {
              block = _block;
            }
          });
          console.log(`\t\tgasLimit:           ${parseInt(block.gasLimit)}`);
          console.log(`\t\testimated gasUsed:   ${estimatedGasUsed}`);
        }
      }
    );
    // ******** GelatoCore.execute() gasUsed estimates END ********

    // ********** EXECUE CALL and EXECUTOR PAYOUT Checks **********
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
      .getExecutionClaim(EXECUTION_CLAIM_ID)
      .call();

    // Fetch current timestamp
    blockNumber = await web3.eth.getBlockNumber();
    block = await web3.eth.getBlock(blockNumber);
    timestamp = block.timestamp;

    // we check the fetched executionClaim data
    assert.strictEqual(executionClaimOwner, EXECUTION_CLAIM_OWNER);
    assert.strictEqual(dappInterface, gelatoDutchX.address);
    // assert.strictEqual(interfaceOrderId, interfaceOrderId);
    assert.strictEqual(_sellToken, sellToken.address);
    assert.strictEqual(_buyToken, buyToken.address);
    assert.strictEqual(sellAmount, SELL_AMOUNT_BN.toString());
    assert(parseInt(executionTime) <= timestamp);
    assert.strictEqual(prepaidExecutionFee, GDX_PREPAID_FEE_BN.toString());

    // Save the interfaceOrderId
    interfaceOrderId = _interfaceOrderId;

    // get executor's balance pre executionClaim minting
    let executorBalancePre = new BN(await web3.eth.getBalance(executor));

    // executor calls gelatoCore.execute(executionClaimId)
    console.log(
      `\n\t\t EXECUTING EXECUTION_CLAIM_ID: ${EXECUTION_CLAIM_ID}\n `
    );

    // benchmarked gasUsed =
    function execute() {
      return new Promise(async (resolve, reject) => {
        await gelatoCore.contract.methods
          .execute(EXECUTION_CLAIM_ID)
          .send({ from: executor, gas: 1000000 }, (error, hash) => {
            if (error) {
              reject(error);
            }
            txHash = hash;
            resolve(hash)
          }) // gas needed to prevent out of gas error
      });
    }
    let result = await execute();
    console.log(`\tExecute TxHash: ${result}\n`);

    console.log("MARCOOOO");
    // Log actual gasUsed
    console.log(`\n\t\tactual gasUsed:     ${txReceipt.gasUsed}`);

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
    // ********** EXECUTE CALL and EXECUTOR PAYOUT Checks END **********

    // ********** LogClaimExecutedAndDeleted Event Checks **********
    // emitted event on GelatoCore: LogClaimExecutedAndDeleted(dappInterface, executor, executionClaimId, executorPayout)
    assert.ok(txReceipt.events.LogClaimExecutedAndDeleted);

    // Log the events return values
    console.log(
      "\n\tLogClaimExecutedAndDeleted return values:\n\t",
      txReceipt.events.LogClaimExecutedAndDeleted.returnValues,
      "\n"
    );

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
      EXECUTION_CLAIM_ID
    );
    assert.strictEqual(
      txReceipt.events.LogClaimExecutedAndDeleted.returnValues
        .gelatoCorePayable,
      prepaidExecutionFee
    );

    // save the executedClaimId
    executedClaimId =
      txReceipt.events.LogClaimExecutedAndDeleted.returnValues.executionClaimId;

    console.log(
      `\n\t\t !!! We just executed executionClaimId: ${executedClaimId} !!! \n\n`
    );

    // ********** LogClaimExecutedAndDeleted Event Checks END **********

    console.log("HEERE 3");

    // ******** Execution Claim burned check  ********
    // emitted event on GelatoCore via Claim base: Transfer(owner, address(0), tokenId)
    assert.ok(txReceipt.events.Transfer);

    // Log the events return values
    console.log(
      "\n\tGelatoCore.Claim.Transfer event return values:\n\t",
      txReceipt.events.Transfer.returnValues,
      "\n"
    );

    // check if event has correct return values
    assert.strictEqual(
      txReceipt.events.Transfer.returnValues.from,
      EXECUTION_CLAIM_OWNER
    );
    assert.strictEqual(txReceipt.events.Transfer.returnValues.executor, "0");
    assert.strictEqual(
      txReceipt.events.Transfer.returnValues.executionClaimId,
      executedClaimId
    );

    // executionClaim struct got deleted on core
    try {
      let deletedExecutionClaim = await GelatoCore.contract.methods
        .getClaimInterface(executionClaimId)
        .call();
      // This test should fail
      console.log(`deletedExecutionClaim: ${deletedExecutionClaim}`);
      assert.equal(deletedExecutionClaim, 0);
    } catch (err) {
      assert(err);
    }
    // ******** Execution Claim burned check END ********

    console.log("HEEEREE 4");

    /*
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
    blockNumber = txReceipt.blockNumber; */

    /*// ############## Withdraw variables ##############

    // Comparing the BUY_TOKEN Balance before and after
    const buyBalanceAfter = await buyTokenContract.balanceOf(seller);
    const buyBalanceBeforeBN = new BN(buyBalanceBefore)
    const buyBalanceAfterBN = new BN(buyBalanceAfter)

    // Calculate the difference before and after the exection
    const buyBalanceDifference = buyBalanceAfterBN.sub(buyBalanceBeforeBN);

    // Variables to calculate the acutal subOrder amount that each seller will sell on the DutchX (subOrderAmount - fee)
    let num;
    let den;
    let oldSubOrderAmount;
    let actualSubOrderAmount;
    let fee;

    // Variables to calculate if the amount of RDN withdrawn is actually correctly calculated
    let withdrawAmount;
    let priceNum;
    let priceDen;

    // Fetch State of the sell order again after all state changes occured
    let sellOrder2 = await gelato.sellOrders(sellOrderHash);


    // Check if we are at the last withdrawal (no subOrder sell execution left)
    if (parseInt(sellOrder.remainingSubOrders) === 0) {

        // We are in the last withdrawal execution, do not check the actual withdraw amount because there is none
        withdrawAmount = executionReceipt.logs[3].args['withdrawAmount'].toString(10)
        priceNum = executionReceipt.logs[1].args['num'].toString(10)
        priceDen = executionReceipt.logs[1].args['den'].toString(10)
        let actualSubOrderAmount = sellOrder2.actualLastSubOrderAmount

        let withdrawAmountBN = new BN(withdrawAmount)
        let priceNumBN = new BN(priceNum)
        let priceDenBN = new BN(priceDen)
        let actualSubOrderAmountBN = new BN(actualSubOrderAmount)
        let calculatedWithdrawAmountBN = actualSubOrderAmountBN.mul(priceNumBN).div(priceDenBN)
        let calculatedWithdrawAmount = calculatedWithdrawAmountBN.toString(10)
        let wasWithdrawAmountCorrectlyCalculated = calculatedWithdrawAmountBN.eq(withdrawAmountBN)

        console.log(`
    ==================================================
        Seller ${BUY_TOKEN} balance comparison (before vs. after execution):
        (Checking the Withdraw logic)
        ------------------------------------------------
        Seller Account:        ${seller}
        BEFORE execution:    > ${web3.utils.fromWei(buyBalanceBefore, "ether")} RDN |
                                | =======================|
        After execution:     > ${web3.utils.fromWei(buyBalanceAfter, "ether")} RDN |
                                | =======================|
        Difference:          > ${web3.utils.fromWei(buyBalanceDifference, "ether")} RDN |
                                | =======================|
                                | =======================|
                                | =======================|
        We just withdrew some ${BUY_TOKEN}!
        Did we withdraw the correct amount based on actual SubOrder Size * DutchX Price of previous auction?
        ------------------------------------------------
        Amount withdrawn: (web3)            > ${web3.utils.fromWei(withdrawAmount, "ether")} RDN |
                            | =======================|
        What should be withdrawn (BN test)  > ${web3.utils.fromWei(calculatedWithdrawAmount, "ether")} RDN |
                            | =======================|
        Both amounts are identical:           ${wasWithdrawAmountCorrectlyCalculated}
        #####################################
        Sell Order completed!  ✅ ✅ ✅
        #####################################
        `);

    // After each execution except the last one where we only withdraw, get the actual withdraw amount
    } else {
        num = executionReceipt.logs[0].args['num'].toString(10)
        den = executionReceipt.logs[0].args['den'].toString(10)
        oldSubOrderAmount = executionReceipt.logs[1].args['subOrderAmount'].toString(10)
        actualSubOrderAmount = executionReceipt.logs[1].args['actualSubOrderAmount'].toString(10)
        fee = executionReceipt.logs[1].args['fee'].toString(10)

        let numBN = new BN(num)
        let denBN = new BN(den)
        let oldSubOrderAmountBN = new BN(oldSubOrderAmount)
        let actualSubOrderAmountBN = new BN(actualSubOrderAmount)
        let feeBN = new BN(fee)
        let calculatedFee = oldSubOrderAmountBN.mul(numBN).div(denBN)
        let calculatedSubOrderAmount = oldSubOrderAmountBN.sub(feeBN)

        console.log(`
    ==================================================
            Seller BUY_TOKEN balance comparison (before vs. after execution):
            (Checking the Withdraw logic)
            ------------------------------------------------
            Seller Account:        ${seller}
            BEFORE execution:    > ${web3.utils.fromWei(buyBalanceBefore, "ether")} RDN |
                                    | =======================|
            After execution:     > ${web3.utils.fromWei(buyBalanceAfter, "ether")} RDN |
                                    | =======================|
            Difference:          > ${web3.utils.fromWei(buyBalanceDifference, "ether")} RDN |
                                    | =======================|
                                    | =======================|
                                    | =======================|
            Show the acutal Sub Order amount that was sold on the DutchX (minus DutchX fee):
            ------------------------------------------------
            Initial SubOrderSize:   > ${web3.utils.fromWei(oldSubOrderAmount, "ether")} WETH |
                                | =======================|
            Actual SubOrderSize:    > ${web3.utils.fromWei(actualSubOrderAmount, "ether")} WETH |
                                | =======================|
            Initial - fee === actual: ${calculatedSubOrderAmount.eq(actualSubOrderAmountBN)}
                                | =======================|
                                | =======================|
                                | =======================|
            Check if fee got calculated correctly in SC:
            ------------------------------------------------
            Calculated fee (web3)    > ${web3.utils.fromWei(calculatedFee, "ether")} WETH |
                                    | =======================|
            Fetched fee:             > ${web3.utils.fromWei(fee, "ether")} WETH |
                                    | =======================|
            Both fees are identical:   ${feeBN.eq(calculatedFee)}
                                    | =======================|
                                    | =======================|
                                    | =======================|
        `);

        // Only calc after first exexAndWithdrawSubOrder func has been executed and if manualWithdraw has not been executed
        if (parseInt(sellOrder.remainingWithdrawals) === parseInt(sellOrder.remainingSubOrders) + 1)
        {
            withdrawAmount = executionReceipt.logs[6].args['withdrawAmount'].toString(10)
            priceNum = executionReceipt.logs[4].args['num'].toString(10)
            priceDen = executionReceipt.logs[4].args['den'].toString(10)


            let withdrawAmountBN = new BN(withdrawAmount)
            let priceNumBN = new BN(priceNum)
            let priceDenBN = new BN(priceDen)

            let calculatedWithdrawAmountBN = actualSubOrderAmountBN.mul(priceNumBN).div(priceDenBN)
            let calculatedWithdrawAmount = calculatedWithdrawAmountBN.toString(10)

            let wasWithdrawAmountCorrectlyCalculated = calculatedWithdrawAmountBN.eq(withdrawAmountBN)

            console.log(`
    ==================================================
            We just withdrew some RND!
            Did we withdraw the correct amount based on actual SubOrder Size * DutchX Price of previous auction?
            ------------------------------------------------
            Amount withdrawn: (web3)            > ${web3.utils.fromWei(withdrawAmount, "ether")} RDN |
                                | =======================|
            What should be withdrawn (BN test)  > ${web3.utils.fromWei(calculatedWithdrawAmount, "ether")} RDN |
                                | =======================|
            Both amounts are identical:           ${wasWithdrawAmountCorrectlyCalculated}
            `);
        }

        }

        // ############## Withdraw variables END ##############

        return (`
        ==================================================
            ExecuteSubOrder was successful!
            Sub Order Executions left: ${sellOrder2.remainingSubOrders}
            Withdraws left: ${sellOrder2.remainingWithdrawals}
        `)*/
  }

  // run the test
  testExecute().then(result => console.log(result));
};
