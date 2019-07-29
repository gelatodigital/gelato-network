let {
  GelatoCore,
  GelatoDutchX,
  SellToken,
  BuyToken,
  DutchExchangeProxy,
  DutchExchange,
  timeTravel,
  MAXGAS,
  BN,
  NUM_SUBORDERS_BN,
  GELATO_GAS_PRICE_BN,
  TOTAL_SELL_VOLUME,
  SUBORDER_SIZE_BN,
  INTERVAL_SPAN,
  GDXSSAW_MAXGAS_BN,
  GELATO_PREPAID_FEE_BN,
  dutchExchangeProxy,
  dutchExchange,
  seller,
  accounts,
  sellToken,
  buyToken,
  gelatoDutchXContract,
  gelatoCore,
  gelatoCoreOwner,
  orderId,
  orderState,
  executionTime,
  interfaceOrderId,
  executionClaimIds,
  MSG_VALUE_BN,
  commandLine,
  executeTestScript
} = require("./truffleTestConfig.js");

describe("successfully executes claim", () => {
  // ******** Deploy new instances Test ********
  before(async () => {
    gelatoDutchXContract = await GelatoDutchX.deployed();
    dutchExchangeProxy = await DutchExchangeProxy.deployed();
    dutchExchange = await DutchExchange.deployed();
    gelatoCore = await GelatoCore.deployed();
    sellToken = await SellToken.deployed();
    buyToken = await BuyToken.deployed();
    gelatoCoreOwner = await gelatoCore.contract.methods.owner().call();
    accounts = await web3.eth.getAccounts();
    seller = accounts[2]; // account[2]
  });

  it("Successfully execute the first claim", async function() {
    require("dotenv").config();

    let copyEnv = [
      ...process.env["EXECUTION_CLAIM"],
      process.env["CLAIM_STATE_ID"]
    ];

    // Execute claim
    let executionClaim = copyEnv[0];
    let claimStateId = copyEnv[1];

    let gelatoDxBalanceBefore = await sellToken.balanceOf(
      gelatoDutchXContract.address
    );
    let dutchExchangeBalanceBefore = await sellToken.balanceOf(
      dutchExchangeProxy.address
    );

    let gelatoDxBalanceBeforeBN = new BN(gelatoDxBalanceBefore.toString());
    let dutchExchangeBalanceBeforeBN = new BN(
      dutchExchangeBalanceBefore.toString()
    );

    function executeClaim() {
      return new Promise(async (resolve, reject) => {
        await gelatoCore.contract.methods
          .execute(executionClaim)
          .send({ from: gelatoCoreOwner, gas: 1000000 }, (error, hash) => {
            if (error) {
              reject(error);
            }
            resolve(hash);
          }); // gas needed to prevent out of gas error
      });
    }
    // call execute() and get hash from callback
    let executeTxHash = await executeClaim();
    console.log(`\tExecute TxHash: ${executeTxHash}\n`);

    // Fetch Order State to check lastAuction Index
    let orderState = await gelatoDutchXContract.contract.methods
      .orderStates(claimStateId)
      .call();

    // Only check if the transfer of tokens from gelato DX interface matches the new balance of the DutchX for execution that occur before the final withdraw
    if (orderState.remainingSubOrders.toString() !== "0")
    {

        let gelatoDxBalanceAfter = await sellToken.balanceOf(
          gelatoDutchXContract.address
        );
        let dutchExchangeBalanceAfter = await sellToken.balanceOf(
          dutchExchangeProxy.address
        );

        let gelatoDxBalanceAfterBN = new BN(gelatoDxBalanceAfter.toString());
        let dutchExchangeBalanceAfterBN = new BN(
          dutchExchangeBalanceAfter.toString()
        );

        let dutchExchangeGotFunds = dutchExchangeBalanceAfterBN.eq(
          dutchExchangeBalanceBeforeBN.add(SUBORDER_SIZE_BN)
        );
        let gelatoDXGotFunds = gelatoDxBalanceAfterBN.eq(
          gelatoDxBalanceBeforeBN.sub(SUBORDER_SIZE_BN)
        );

        assert.isTrue(
          dutchExchangeGotFunds,
          `DutchX was ${dutchExchangeBalanceBeforeBN.toString()}, received ${SUBORDER_SIZE_BN.toString()}, but is now ${dutchExchangeBalanceAfterBN.toString()}`
        );

        assert.isTrue(
          gelatoDXGotFunds,
          `gelatoDX Interface should be less ${SUBORDER_SIZE_BN.toString()}`
        );
    }


    // get executeTxReceipt with executeTx hash
    let txReceipt = await web3.eth.getTransactionReceipt(
      executeTxHash,
      (error, result) => {
        if (error) {
          console.error;
        }
      }
    );

    // CHECK: Execute Transaction went through
    assert.exists(txReceipt, "Execute() tx did not go through");

    let blockNumber = txReceipt.blockNumber;

    // this.timeout(5000);

    await gelatoCore.getPastEvents(
      "LogClaimExecutedAndDeleted",
      (error, events) => {
        if (error) {
          console.error("errored during gelatoCore.getPastEvent()");
        } else {
          let event = events[0];
          // Make sure event were emitted
          assert.exists(
            event,
            "LogClaimExecutedAndDeleted _event do not exist"
          );
          // Event data checks
          assert.strictEqual(event.event, "LogClaimExecutedAndDeleted");
          assert.strictEqual(
            event.blockNumber,
            blockNumber,
            "LogClaimExecutedAndDeleted blocknumber problem"
          );
          assert.strictEqual(
            event.returnValues.dappInterface,
            gelatoDutchXContract.address,
            "LogClaimExecutedAndDeleted dappInterface problem"
          );
          assert.strictEqual(
            event.returnValues.executor,
            gelatoCoreOwner,
            "LogClaimExecutedAndDeleted executor problem"
          );
          assert.strictEqual(
            event.returnValues.gelatoCorePayable,
            GELATO_PREPAID_FEE_BN.toString(),
            "LogClaimExecutedAndDeleted gelatoCorePayable problem"
          );

        }
      }
    );
  });
});
