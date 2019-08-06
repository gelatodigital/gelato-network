// Exec Test

/*
 */

let {
  numberOfSubOrders,
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
  orderStateId,
  orderState,
  executionTime,
  interfaceOrderId,
  executionClaimIds,
  MSG_VALUE_BN,
  execShellCommand,
  DxGetter,
  execShellCommandLog,
  truffleAssert
} = require("./truffleTestConfig.js");

let txHash;
let txReceipt;
let revertExecutor;
let amountReceivedByExecutor;
let amountDeductedfromInterface;
let firstExecutionClaimId
let sellOrderId;

describe("Successfully execute first execution claim", () => {
  before(async () => {
    gelatoDutchExchange = await GelatoDutchX.deployed();
    dutchExchangeProxy = await DutchExchangeProxy.deployed();
    dutchExchange = await DutchExchange.deployed();
    gelatoCore = await GelatoCore.deployed();
    sellToken = await SellToken.deployed();
    buyToken = await BuyToken.deployed();
    dxGetter = await DxGetter.deployed();
    accounts = await web3.eth.getAccounts();
    gelatoCoreOwner = await gelatoCore.contract.methods.owner().call();
    seller = accounts[2];
    revertExecutor = accounts[8]
    executor = accounts[9]; // account[2]
  });

  it("fetch the correct executionClaimId to execute", async() => {
    // Get the current execution claim on the core
    let lastExecutionClaimId = await gelatoCore.contract.methods
      .getCurrentExecutionClaimId()
      .call();
    // Get the first execution claim minted in by the mint test
    firstExecutionClaimId =
      parseInt(lastExecutionClaimId) - (parseInt(numberOfSubOrders) * 2) + 1;

    // Fetch owner of executionClaim, if address(0) gets returned, we it already was executed and we try the next
    let mustNotBeZero = "0x0";
    while (mustNotBeZero === "0x0")
    {
      try
      {
        mustNotBeZero = await gelatoCore.contract.methods.ownerOf(firstExecutionClaimId).call()
      }
      catch(err)
      {
        firstExecutionClaimId = firstExecutionClaimId + 1
      }

    }
    console.log(`ExecutionClaimID: ${firstExecutionClaimId}`)
  })

  it("Check if execution claim is executable based on its execution Time, if not, test that execution reverts and fast forward", async () => {
    // Fetch executionTime from interface
    if (firstExecutionClaimId % 2 === 0) {
      sellOrderId = await gelatoDutchExchange.contract.methods.sellOrderLink(firstExecutionClaimId).call();
    }
    else
    {
      sellOrderId = firstExecutionClaimId
    }
    console.log(`Sell Order ID: ${sellOrderId}`)
    let sellOrder = await gelatoDutchExchange.contract.methods.sellOrders(sellOrderId.toString()).call()
    console.log(`Sell Order: ${sellOrder}`)
    let sellOrderExecutionTime = sellOrder.executionTime
    console.log(`ExecutionTime: ${sellOrderExecutionTime}`);

    // Fetch time
    let blockNumber = await web3.eth.getBlockNumber();
    let block = await web3.eth.getBlock(blockNumber);
    let beforeTimeTravel = block.timestamp;

    let secondsUntilExecution  = sellOrderExecutionTime - beforeTimeTravel
    console.log(secondsUntilExecution)

    console.log(`Claim is executable at: ${sellOrderExecutionTime}. Current Time: ${beforeTimeTravel}
                 Difference: ${secondsUntilExecution}`);

    // If execution Time of claim is in the future, we execute and expect a revert and then fast forward in time to the execution time
    if(parseInt(secondsUntilExecution) > 0)
    {
      // Execution should revert
      // Gas price to calc executor payout
      let txGasPrice = await web3.utils.toWei("5", "gwei");
      await truffleAssert.reverts(
        gelatoCore.contract.methods
          .execute(firstExecutionClaimId)
          .send({ from: revertExecutor, gas: 1000000, gasPrice: txGasPrice }),
        "Execution of dappInterface function must be successful"
      ); // gas needed to prevent out of gas error

      // fast forward
      await timeTravel.advanceTimeAndBlock(secondsUntilExecution);
      console.log(`Time travelled ${secondsUntilExecution} seconds`)

    }

    // Fetch current time again, in case we fast forwarded in time
    let blockNumber2 = await web3.eth.getBlockNumber();
    let block2 = await web3.eth.getBlock(blockNumber2);
    let afterTimeTravel = block2.timestamp;

    // Check if execution claim is executable
    // assert.equal(executionTime + 15, claimsExecutionTime.toString(), `${claimsExecutionTime} should be equal to the execution time we set + 15 seconds`)
    let claimsExecutionTimeBN = new BN(sellOrder.executionTime.toString());
    let afterTimeTravelBN = new BN(afterTimeTravel);
    let claimIsExecutable = afterTimeTravelBN.gte(claimsExecutionTimeBN);
    // Check if execution claim is executable, i.e. lies in the past
    assert.isTrue(
      claimIsExecutable,
      `${afterTimeTravel} should be greater than ${claimsExecutionTimeBN.toString()}`
    );
  });

  it(`estimates GelatoCore.execute() gasUsed and logs gasLimit`, async () => {
    // Get and log estimated gasUsed by splitSellOrder fn
    gelatoCore.contract.methods.execute(firstExecutionClaimId).estimateGas(
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

  it("Check that seller is owner of execution Claim", async() => {
    let fetchedSeller = await gelatoCore.contract.methods.ownerOf(firstExecutionClaimId).call()
    assert.equal(fetchedSeller.toString(), seller, "Execution Claim owner should be equal to predefined seller");
  })

  it("Check that, if we are calling withdraw, sellOrder.sold == true", async() => {
    // Only check if exeuctionClaimId is even => Change to make it work with other tests
    if (firstExecutionClaimId % 2 === 0) {
      let sellOrderId = await gelatoDutchExchange.contract.methods.sellOrderLink(firstExecutionClaimId).call()
      let sellOrder = await gelatoDutchExchange.contract.methods.sellOrders(sellOrderId).call()
      let wasSold = sellOrder.sold;
      console.log('Was sold? wasSold ', wasSold);
      assert.equal(wasSold, true, "Execution Claim owner should be equal to predefined seller");
    }
  })

  it("Check that the past auction cleared and a price has been found", async() => {
    let sellOrder = await gelatoDutchExchange.contract.methods.sellOrders(firstExecutionClaimId).call()
    console.log(`SellOrder: ${sellOrder}`)
    let orderStateId = sellOrder.orderStateId;
    let orderState = await gelatoDutchExchange.contract.methods.orderStates(orderStateId).call()
    let lastAuctionIndex = orderState.lastAuctionIndex;
    // Check if auction cleared with DutchX Getter
    let returnValue = await dxGetter.contract.methods.getClosingPrices(sellToken.address, buyToken.address, lastAuctionIndex).call();
    console.log(returnValue)
    // assert.isEqual(wasSold, true, "Execution Claim owner should be equal to predefined seller");
  })

  it("Successfully execute first execution claim", async () => {
    // Fetch executor pre Balance
    let executorBalancePre = new BN(await web3.eth.getBalance(executor));

    // Fetch ERCO balancebefore
    let sellerTokenBalanceBeforeBN = new BN(await buyToken.contract.methods.balanceOf(seller).call())

    let gdxGelatoBalanceBefore = new BN(await gelatoCore.contract.methods.getInterfaceBalance(gelatoDutchExchange.address).call())

    // Fetch sellOrder before we delete it
    let sellOrder = await gelatoDutchExchange.contract.methods.sellOrders(sellOrderId).call();

    // Gas price to calc executor payout
    let txGasPrice = await web3.utils.toWei("5", "gwei");
    function execute() {
      return new Promise(async (resolve, reject) => {
        await gelatoCore.contract.methods
          .execute(firstExecutionClaimId)
          .send(
            { from: executor, gas: 1000000, gasPrice: txGasPrice },
            (error, hash) => {
              if (error) {
                reject(error);
              }
              resolve(hash);
            }
          ); // gas needed to prevent out of gas error
      });
    }
    // call execute() and get hash from callback
    txHash = await execute();
    // get txReceipt with executeTx hash
    let execTxReceipt;
    await web3.eth.getTransactionReceipt(txHash, (error, result) => {
      if (error) {
        console.error;
      }
      execTxReceipt = result;
    });

    let gdxGelatoBalanceAfter = new BN(await gelatoCore.contract.methods.getInterfaceBalance(gelatoDutchExchange.address).call())
    console.log(gdxGelatoBalanceBefore.toString())
    console.log(gdxGelatoBalanceAfter.toString())

    // #### CHECKS FOR BOTH FUNCTIONS ####

    let totalGasUsed
    let usedGasPrice
    let executorPayout
    await gelatoCore.getPastEvents("LogExecutionMetrics", (error, events) => {
      if (error) {console.error}
      else
      {
        let event = events[0]
        totalGasUsed = event.returnValues.totalGasUsed
        usedGasPrice = event.returnValues.usedGasPrice
        executorPayout = event.returnValues.executorPayout
      }
    })

    console.log(`
      Total Gas returned from contract: ${totalGasUsed}
      Cummulative Tx Gas consumed: ${execTxReceipt.cumulativeGasUsed}
      Tx Gas consumed: ${execTxReceipt.gasUsed}
      usedGasPrice: ${usedGasPrice}
      executorPayout: ${executorPayout}
    `)


    amountReceivedByExecutor = new BN(executorPayout)

    let executorTxCost = txGasPrice * execTxReceipt.gasUsed;
    let executorTxCostBN = new BN(executorTxCost);


    // CHECK that core owners ETH balance decreased by 1 ETH + tx fees
    // Sellers ETH Balance post mint
    let executorBalancePost = new BN(await web3.eth.getBalance(executor));

    // Calculate the Executor payout was correct
    // 1. The execuor reward specified in the execution claim on the interfac should equal the postBalance - preBalance

    // Fetch reward specified in gelatoCore
    console.log(`Executor Pre Balance: ${executorBalancePre}`);
    console.log(`Executor Post Balance: ${executorBalancePost}`);

    // Test that executor made a profit with executing the tx
    let executorMadeProfit = executorBalancePost.gte(executorBalancePre)
    assert.isTrue(executorMadeProfit, "Executor should make a profit executing the transcation")

    // #### CHECKS FOR BOTH FUNCTIONS END ####


    // Fetch past events of gelatoDutchExchange
    await gelatoDutchExchange.getPastEvents(
      "LogActualSellAmount",
      (error, events) => {
        // console.log(events);
      }
    );

    // #### CHECKS FOR BOTH FUNCTIONS END ####


    // #### CHECKS FOR WHEN execWithdraw gets called ####

    // Check buyToken balance of user before vs after

    let sellerTokenBalanceAfterBN = new BN(await buyToken.contract.methods.balanceOf(seller).call());
    let receivedBuyTokens = sellerTokenBalanceAfterBN.sub(sellerTokenBalanceBeforeBN);

    let sellAmount = sellOrder.amount;

    let orderStateId = sellOrder.orderStateId;

    let orderState = await gelatoDutchExchange.contract.methods.orderStates(orderStateId).call()

    let lastAuctionIndex = orderState.lastAuctionIndex;


    let closingPrice = await dxGetter.contract.methods.getClosingPrices(sellToken.address, buyToken.address, lastAuctionIndex).call()
    let num = new BN(closingPrice[0].toString())
    let den = new BN(closingPrice[1].toString())

    let buyTokenReceivable = new BN(sellAmount).mul(num).div(den)

    let buyTokenAmountIsEqual = buyTokenReceivable.eq(receivedBuyTokens)

    assert.isTrue(buyTokenAmountIsEqual, `Buy Tokens received ${receivedBuyTokens.toString()} should == ${buyTokenReceivable.toString()}`)
    console.log('Closing Prices: num ', num);
    console.log('Closing Prices: den ', den);

    console.log('Sell Amount: sellAmount ', sellAmount);

    console.log('Received Tokens: receivedBuyTokens ', receivedBuyTokens.toString());

    // #### CHECKS FOR WHEN execWithdraw gets called END ####


    // #### CHECKS FOR WHEN execDepositAndSell gets called ####

    // Check if we did an automated top up
    await gelatoDutchExchange.getPastEvents("LogAddedBalanceToGelato", (error, events) => {
      if (events[0] === undefined)
      {
        amountDeductedfromInterface = gdxGelatoBalanceBefore.sub(gdxGelatoBalanceAfter);
      }
      else
      {
        amountDeductedfromInterface = gdxGelatoBalanceBefore.sub(gdxGelatoBalanceAfter).add(new BN(events[0].returnValues.interfaceEthBalance));
      }
    })

    // #### CHECKS FOR WHEN execDepositAndSell gets called END ####



    // // Get costs of dpositAndWithDrawFunc
    // await gelatoDutchExchange.getPastEvents("LogGas", (error, events) => {
    //   let event = events[0]
    //   let gas1 = event.returnValues.gas1
    //   let gas2 = event.returnValues.gas2
    //   console.log(`
    //     Consumed Gas for depositAndSell in gdx: ${gas1 - gas2}`)
    // })
  });

  // Check that balance of interface was deducted by the same amount the executor received
  it("balance of interface was deducted by the same amount the executor received", async() => {
    let payoutWasEqual = amountReceivedByExecutor.eq(amountDeductedfromInterface)
    assert.isTrue(payoutWasEqual, "Payout to executor equals amount deducted from interface balance")

  })



  // Check balance of gelatoDutchExchange pre vs post in eth in own SC

  // Check if core emmited correct events such as LogClaimExecutedBrunedAndDeleted

  // Check that an executor can call execute with the same claimId again to drain the interface

  // Check that sellOrder in interface got updated correcty
});
