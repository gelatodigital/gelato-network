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
    BN,
    NUM_SUBORDERS_BN,
    GELATO_GAS_PRICE_BN,
    TOTAL_SELL_VOLUME,
    SUBORDER_SIZE_BN,
    INTERVAL_SPAN,
    GDX_MAXGAS_BN,
    GDX_PREPAID_FEE_BN,
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
    truffleAssert,
    userEthBalance,
    userSellTokenBalance,
    userBuyTokenBalance,
    executorEthBalance,
    dutchXMaxGasBN
} = require("./truffleTestConfig.js");

let txHash;
let txReceipt;
let revertExecutor;
let amountReceivedByExecutor;
let amountDeductedfromInterface;
let nextExecutionClaim;
let depositAndSellClaim;
let withdrawClaim;
let sellOrder;

let decodedPayload;
let decodedPayloads = {}
let definedExecutionTimeBN;
let lastExecutionClaimId;
let execDepositAndSell;
let execWithdraw;
let isDepositAndSell;
// Gas limit 1M
let gasLimit = 1000000;

describe("Successfully execute execution claim", () => {
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
    revertExecutor = accounts[8];
    executor = accounts[9];
    execDepositAndSell = web3.eth.abi.encodeFunctionSignature('execDepositAndSell(uint256,address,address,uint256,uint256,uint256,uint256,uint256,bool)')
    execWithdraw = web3.eth.abi.encodeFunctionSignature('execWithdraw(uint256,address,address,uint256,uint256)')
  });

  it("Fetch Before Balance of seller and executor", async function() {
    // Fetch User Ether Balance
    userEthBalance = await web3.eth.getBalance(seller);
    // Fetch User SellToken Balance
    userSellTokenBalance = await sellToken.contract.methods
      .balanceOf(seller)
      .call();
    // Fetch User BuyToken Balance
    userBuyTokenBalance = await buyToken.contract.methods
      .balanceOf(seller)
      .call();
    // Fetch Executor Ether Balance
    executorEthBalance = await web3.eth.getBalance(executor);
  });

  it("fetch the correct executionClaimId to execute", async () => {
    // Get the current execution claim on the core
    lastExecutionClaimId = await gelatoCore.contract.methods
      .getCurrentExecutionClaimId()
      .call();
    // Get the first execution claim minted in by the mint test
    nextExecutionClaim =
      parseInt(lastExecutionClaimId) - parseInt(numberOfSubOrders) * 2 + 1;

    // Fetch owner of executionClaim, if address(0) gets returned, we it already was executed and we try the next
    let mustNotBeZero = "0x0";
    while (mustNotBeZero === "0x0") {
      try {
        mustNotBeZero = await gelatoCore.contract.methods
          .ownerOf(nextExecutionClaim)
          .call();
      } catch (err) {
        nextExecutionClaim = nextExecutionClaim + 1;
      }
    }
    console.log(`ExecutionClaimID: ${nextExecutionClaim}`);
    assert.isTrue(true);
  });

  it("Set correct depositAndSell claim & withdraw claim", async () => {
    // Get the current execution claim on the core
    // Assuming we get an depositAndSell claim
    let sellOrderTest = await gelatoDutchExchange.contract.methods
      .sellOrders(nextExecutionClaim + 1, nextExecutionClaim)
      .call();
    // It's a withdraw claim
    if (sellOrderTest.sellAmount === "0") {
      depositAndSellClaim = nextExecutionClaim - 1;
      withdrawClaim = nextExecutionClaim;
    } else {
      depositAndSellClaim = nextExecutionClaim;
      withdrawClaim = nextExecutionClaim + 1;
    }
    assert.isTrue(true);
  });

  it("Check if execution claim is executable based on its execution Time, if not, test that execution reverts and fast forward", async () => {
    sellOrder = await gelatoDutchExchange.contract.methods
      .sellOrders(withdrawClaim, depositAndSellClaim)
      .call();
    let sellOrderExecutionTime = sellOrder.executionTime;

      let sellOrderExecutionTime = decodedPayload._executionTime

    let secondsUntilExecution = sellOrderExecutionTime - beforeTimeTravel;

      let secondsUntilExecution  = sellOrderExecutionTime - beforeTimeTravel

    // If execution Time of claim is in the future, we execute and expect a revert and then fast forward in time to the execution time
    if (parseInt(secondsUntilExecution) > 0) {
      // Execution should revert
      // Gas price to calc executor payout
      let txGasPrice = await web3.utils.toWei("5", "gwei");
      await truffleAssert.reverts(
        gelatoCore.contract.methods
          .execute(nextExecutionClaim)
          .send({ from: revertExecutor, gas: 1000000, gasPrice: txGasPrice }),
        "Execution of dappInterface function must be successful"
      ); // gas needed to prevent out of gas error

      // fast forward
      await timeTravel.advanceTimeAndBlock(secondsUntilExecution);
      // console.log(`Time travelled ${secondsUntilExecution} seconds`)
    }

      }

      // Fetch current time again, in case we fast forwarded in time
      let blockNumber2 = await web3.eth.getBlockNumber();
      let block2 = await web3.eth.getBlock(blockNumber2);
      let afterTimeTravel = block2.timestamp;

      // Check if execution claim is executable
      // assert.equal(executionTime + 15, claimsExecutionTime.toString(), `${claimsExecutionTime} should be equal to the execution time we set + 15 seconds`)
      let claimsExecutionTimeBN = new BN(sellOrderExecutionTime);
      let afterTimeTravelBN = new BN(afterTimeTravel);
      let claimIsExecutable = afterTimeTravelBN.gte(claimsExecutionTimeBN);
      // Check if execution claim is executable, i.e. lies in the past
      assert.isTrue(
        claimIsExecutable,
        `${afterTimeTravel} should be greater than ${claimsExecutionTimeBN.toString()}`
      );
    }
  });

  // TEST IS COMMENTED OUT AS TRUFFLE HAS A BUG THAT CRASHES GANACHE WHEN ESTIMATEGAS IS USED
  it(`estimates GelatoCore.execute() gasUsed and logs gasLimit`, async () => {
    // Get and log estimated gasUsed by splitSellOrder fn
    // gelatoCore.contract.methods.execute(nextExecutionClaim).estimateGas(
    //   { from: executor, gas: gasLimit }, // gas needed to prevent out of gas error
    //   async (error, estimatedGasUsed) => {
    //     if (error) {
    //       console.error;
    //     } else {
    //       // Get and log gasLimit
    //       await web3.eth.getBlock("latest", false, (error, _block) => {
    //         if (error) {
    //           console.error;
    //         } else {
    //           block = _block;
    //         }
    //       });
    //       // console.log(`\t\tgasLimit:           ${block.gasLimit}`);
    //       // console.log(`\t\testimated gasUsed:   ${estimatedGasUsed}`);
    //     }
    //   }
    // );
    // console.log("estimates GElatoCore.execute()")
    // This test just tried to get and log the estimate
    assert(true);
  });

  it("Check that seller is owner of execution Claim", async () => {
    let fetchedSeller = await gelatoCore.contract.methods
      .ownerOf(nextExecutionClaim)
      .call();
    assert.equal(
      fetchedSeller.toString(),
      seller,
      "Execution Claim owner should be equal to predefined seller"
    );
  });

  it("Check that, if we are calling withdraw, sellOrder.posted == true, else posted == false", async () => {
    // Only check if exeuctionClaimId is even => Change to make it work with other tests
    if (nextExecutionClaim % 2 === 0) {
      let wasPosted = sellOrder.posted;
      assert.equal(
        wasPosted,
        true,
        "Execution Claim owner should be equal to predefined seller"
      );
    } else if (nextExecutionClaim % 2 !== 0) {
      let wasPosted = sellOrder.posted;
      assert.equal(
        wasPosted,
        false,
        "Execution Claim owner should be equal to predefined seller"
      );
    }
  });

  it("Check that the past auction cleared and a price has been found", async () => {
    let orderStateId = sellOrder.orderStateId;
    let orderState = await gelatoDutchExchange.contract.methods
      .orderStates(orderStateId)
      .call();
    let lastAuctionIndex = orderState.lastParticipatedAuctionIndex;
    // Check if auction cleared with DutchX Getter
    let returnValue = await dxGetter.contract.methods
      .getClosingPrices(sellToken.address, buyToken.address, lastAuctionIndex)
      .call();
    // assert.isEqual(wasPosted, true, "Execution Claim owner should be equal to predefined seller");
  });

  it("Successfully execute execution claim", async () => {
    // Fetch executor pre Balance
    let executorBalancePre = new BN(await web3.eth.getBalance(executor));

    // Fetch ERCO balancebefore
    let sellerTokenBalanceBeforeBN = new BN(
      await buyToken.contract.methods.balanceOf(seller).call()
    );

    let gdxGelatoBalanceBefore = new BN(
      await gelatoCore.contract.methods
        .interfaceBalances(gelatoDutchExchange.address)
        .call()
    );

    // Gas price to calc executor payout
    let txGasPrice = await web3.utils.toWei("5", "gwei");
    function execute() {
      return new Promise(async (resolve, reject) => {
        await gelatoCore.contract.methods
          .execute(nextExecutionClaim)
          .send(
            { from: executor, gas: gasLimit, gasPrice: txGasPrice },
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
    // console.log(execTxReceipt)
    // let one = execTxReceipt.gasLimit

    let gdxGelatoBalanceAfter = new BN(
      await gelatoCore.contract.methods
        .interfaceBalances(gelatoDutchExchange.address)
        .call()
    );

    // #### CHECKS FOR BOTH FUNCTIONS ####

    let totalGasUsed;
    let usedGasPrice;
    let executorPayout;
    await gelatoCore.getPastEvents(
      "LogClaimExecutedBurnedAndDeleted",
      (error, events) => {
        if (error) {
          console.error;
        } else {
          let event = events[0];
          totalGasUsed = event.returnValues.gasUsedEstimate;
          usedGasPrice = event.returnValues.cappedGasPriceUsed;
          executorPayout = event.returnValues.executorPayout;
        }
      }
    );

    // console.log(`
    //   Total Gas returned from contract: ${totalGasUsed}
    //   Cummulative Tx Gas consumed: ${execTxReceipt.cumulativeGasUsed}
    //   Tx Gas consumed: ${execTxReceipt.gasUsed}
    //   usedGasPrice: ${usedGasPrice}
    //   executorPayout: ${executorPayout}
    // `)

    amountReceivedByExecutor = new BN(executorPayout);

    let executorTxCost = txGasPrice * execTxReceipt.gasUsed;
    let executorTxCostBN = new BN(executorTxCost);

    // CHECK that core owners ETH balance decreased by 1 ETH + tx fees
    // Sellers ETH Balance post mint
    let executorBalancePost = new BN(await web3.eth.getBalance(executor));

    // Calculate the Executor payout was correct
    // 1. The execuor reward specified in the execution claim on the interfac should equal the postBalance - preBalance

    // Fetch reward specified in gelatoCore
    // console.log(`Executor Pre Balance: ${executorBalancePre}`);
    // console.log(`Executor Post Balance: ${executorBalancePost}`);

    // Test that executor made a profit with executing the tx
    let executorMadeProfit = executorBalancePost.gte(executorBalancePre);
    assert.isTrue(
      executorMadeProfit,
      "Executor should make a profit executing the transcation"
    );

    // #### CHECKS FOR BOTH FUNCTIONS ####

    // Fetch past events of gelatoDutchExchange
    await gelatoDutchExchange.getPastEvents(
      "LogActualSellAmount",
      (error, events) => {
        // console.log(events);
      }
    );

    // console.log(`----------------

    // Was execution claim minted?

    // `)
    // CHECK IF NEW EXECUTION CLAIM WAS MINTED
    // await gelatoCore.getPastEvents(
    //   "LogNewExecutionClaimMinted",
    //   (error, events) => {
    //     console.log(events);
    //   }
    // );

    // console.log(`---------------
    //   Check if execute resulted in true

    // `)
    // CHECK IF Execution failed or not
    // await gelatoCore.getPastEvents(
    //   "ExecuteResult",
    //   (error, events) => {
    //     console.log(events);
    //   }
    // );

    // let zero;
    // let num0;
    // let num1;
    // let num2;
    // let num3;
    // let num4;
    // let num5;
    // let num6;
    // let num7;

    // let one
    // let two;
    // let three;
    // let four;
    // let five;
    // let six;
    // let seven;

    // // CHECK IF Execution failed or not
    // await gelatoCore.getPastEvents(
    //   "LogGasConsumption",
    //   (error, events) => {
    //     zero = events[0].returnValues.gasConsumed
    //     num0 = events[0].returnValues.num
    //     one = events[1].returnValues.gasConsumed
    //     num1 = events[1].returnValues.num
    //     two = events[2].returnValues.gasConsumed
    //     num2 = events[2].returnValues.num
    //     three = events[3].returnValues.gasConsumed
    //     num3 = events[3].returnValues.num
    //     four = events[4].returnValues.gasConsumed
    //     num4 = events[4].returnValues.num
    //     five = events[5].returnValues.gasConsumed
    //     num5 = events[5].returnValues.num
    //     six = events[6].returnValues.gasConsumed
    //     num6 = events[6].returnValues.num
    //     seven = events[7].returnValues.gasConsumed
    //     num7 = events[7].returnValues.num
    //   }
    // );
    // let gasOverhead = 41414;
    // let firstOverhead = (gasLimit - zero)
    // let inbetweenGasLeft = (zero - one) + (two - three) + (six - seven)
    // let secondOverhead = six - seven
    // let beforeCanExec = (gasLimit - zero)
    // let canExec = (zero - one)
    // let afterCanExec = (one - two)
    // let conductAtmoicCall = (two - five)
    // let externalAtomicCall = (three - four)
    // let execEnd = (five - six)
    // let executorPayoutCalc = zero - six + gasOverhead

    // // let internalGasConsumption = firstInternal + secondInternal + thirdInternal + externalAtomicCall
    // // let canExecuteCost = (zero - one)

    // console.log(`
    // -------------------

    //   ${num2}: ${two}
    //   ${num3}: ${three}
    //   ${num4}: ${four}
    //   ${num5}: ${five}

    //   In between Gas Left:            ${inbetweenGasLeft}

    //   -------------------
    //   first Overhead                  ${firstOverhead}
    //   second Overhead                 ${secondOverhead}
    //   Total event based:              ${gasLimit - seven}
    //   Calc Executor Payout Gas:       ${executorPayoutCalc}
    //   -------------------
    //   Diff:                           ${gasLimit - seven - executorPayoutCalc}

    //   Total event based:              ${gasLimit - seven}
    //   Total real:                     ${execTxReceipt.gasUsed}
    //   -------------------
    //   Diff:                           ${gasLimit - seven - execTxReceipt.gasUsed}
    // `)

    // Tests to test whether gas consumption of static parts of exec are the same



    // // Fetch past events of gelatoDutchExchange
    // await gelatoDutchExchange.getPastEvents(
    //   "LogWithdrawAmount",
    //   (error, events) => {
    //     console.log(events);
    //   }
    // );

    // // Fetch past events of gelatoDutchExchange
    // await gelatoCore.getPastEvents(
    //   "CanExecuteFailed",
    //   (error, events) => {
    //     console.log(events);
    //   }
    // );

    // // Fetch past events of gelatoDutchExchange
    // await buyToken.getPastEvents(
    //   "Transfer",
    //   (error, events) => {
    //     console.log(events);
    //   }
    // );



    // #### CHECKS FOR BOTH FUNCTIONS END ####

    // #### CHECKS FOR WHEN execWithdraw gets called ####

    // Check buyToken balance of user before vs after

    let sellerTokenBalanceAfterBN = new BN(
      await buyToken.contract.methods.balanceOf(seller).call()
    );
    let receivedBuyTokens = sellerTokenBalanceAfterBN.sub(
      sellerTokenBalanceBeforeBN
    );

    let sellAmount = sellOrder.sellAmount;

    let orderStateId = sellOrder.orderStateId;

    let orderState = await gelatoDutchExchange.contract.methods
      .orderStates(orderStateId)
      .call();

    let lastAuctionIndex = orderState.lastParticipatedAuctionIndex;

    let closingPrice = await dxGetter.contract.methods
      .getClosingPrices(sellToken.address, buyToken.address, lastAuctionIndex)
      .call();
    let num = new BN(closingPrice[0].toString());
    let den = new BN(closingPrice[1].toString());

    let buyTokenReceivable = new BN(sellAmount).mul(num).div(den);

    let buyTokenAmountIsEqual = buyTokenReceivable.eq(receivedBuyTokens);

    assert.isTrue(
      buyTokenAmountIsEqual,
      `Buy Tokens received ${receivedBuyTokens.toString()} should == ${buyTokenReceivable.toString()}`
    );
    // console.log('Closing Prices: num ', num);
    // console.log('Closing Prices: den ', den);

    // console.log('Sell Amount: sellAmount ', sellAmount);

    // console.log('Received Tokens: receivedBuyTokens ', receivedBuyTokens.toString());

    // #### CHECKS FOR WHEN execWithdraw gets called END ####

    // #### CHECKS FOR WHEN execDepositAndSell gets called ####

    // Check if we did an automated top up
    await gelatoDutchExchange.getPastEvents(
      "LogGelatoBalanceAdded",
      (error, events) => {
        if (events[0] === undefined) {
          amountDeductedfromInterface = gdxGelatoBalanceBefore.sub(
            gdxGelatoBalanceAfter
          );
          //   console.log(`
          // GelatoBalanceBefore: ${gdxGelatoBalanceBefore.toString()}
          // GelatoBalanceAfter: ${gdxGelatoBalanceAfter.toString()}`)
        } else {
          amountDeductedfromInterface = gdxGelatoBalanceBefore
            .sub(gdxGelatoBalanceAfter)
            .add(new BN(events[0].returnValues.amount));
          //   console.log(`
          // GelatoBalanceBefore: ${gdxGelatoBalanceBefore.toString()}
          // GelatoBalanceAfter: ${gdxGelatoBalanceAfter.toString()}
          // InterfaceEthBalance: ${events[0].returnValues.weiAmount}`)
        }
      }
    );

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
  it("balance of interface was deducted by the same amount the executor received", async () => {
    let payoutWasEqual = amountReceivedByExecutor.eq(
      amountDeductedfromInterface
    );
    // console.log(`
    //   Amount Received: ${amountReceivedByExecutor.toString()}
    //   Amount Deducted interface: ${amountDeductedfromInterface.toString()}`)
    assert.isTrue(
      payoutWasEqual,
      "Payout to executor equals amount deducted from interface balance"
    );
  });

  it("What happened in this test?", async function() {
    // Fetch User Ether Balance
    userEthBalanceAfter = await web3.eth.getBalance(seller);
    // Fetch User SellToken Balance
    userSellTokenBalanceAfter = await sellToken.contract.methods
      .balanceOf(seller)
      .call();
    // Fetch User BuyToken Balance
    userBuyTokenBalanceAfter = await buyToken.contract.methods
      .balanceOf(seller)
      .call();
    // Fetch Executor Ether Balance
    executorEthBalanceAfter = await web3.eth.getBalance(executor);

    console.log(`
      ***************************************************+

      SELLER BALANCE:
        ETH Balances Before:  ${userEthBalance / 10 ** 18} ETH
        ETH Balances After:   ${userEthBalanceAfter / 10 ** 18} ETH
        -----------
        Difference:           ${(userEthBalanceAfter - userEthBalance) /
          10 ** 18} ETH

        WETH Balance Before:  ${userSellTokenBalance / 10 ** 18} WETH
        WETH Balance After:   ${userSellTokenBalanceAfter / 10 ** 18} WETH
        -----------
        Difference:           ${(userSellTokenBalanceAfter -
          userSellTokenBalance) /
          10 ** 18} WETH

        ICE Balance Before:   ${userBuyTokenBalance / 10 ** 18} ICE🍦
        ICE Balance After:    ${userBuyTokenBalanceAfter / 10 ** 18} ICE🍦
        -----------
        Difference:           ${(userBuyTokenBalanceAfter -
          userBuyTokenBalance) /
          10 ** 18} ICE🍦

      EXECUTOR BALANCE:
        ETH Balance Before:   ${executorEthBalance / 10 ** 18} ETH
        ETH Balance After:    ${executorEthBalanceAfter / 10 ** 18} ETH
        -----------
        Difference:           ${(executorEthBalanceAfter - executorEthBalance) /
          10 ** 18} ETH

      ***************************************************+

    `);

    assert.isTrue(true);
  });

  // Check balance of gelatoDutchExchange pre vs post in eth in own SC

  // Check if core emmited correct events such as LogClaimExecutedBrunedAndDeleted

  // Check that an executor can call execute with the same claimId again to drain the interface

  // Check that sellOrder in interface got updated correcty
});
