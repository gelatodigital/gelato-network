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
let nextExecutionClaim
let depositAndSellClaim
let withdrawClaim
let sellOrder;

let decodedPayload;
let decodedPayloads = {}
let definedExecutionTimeBN;
let lastExecutionClaimId;
let execDepositAndSell;
let execWithdraw;
let isDepositAndSell;

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
    revertExecutor = accounts[8]
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
  })

  it("fetch the correct executionClaimId to execute", async() => {
    // Get the current execution claim on the core
    lastExecutionClaimId = await gelatoCore.contract.methods
      .getCurrentExecutionClaimId()
      .call();
    // Get the first execution claim minted in by the mint test
    nextExecutionClaim =
      parseInt(lastExecutionClaimId) - (parseInt(numberOfSubOrders) * 2) + 1;

    // Fetch owner of executionClaim, if address(0) gets returned, we it already was executed and we try the next
    let mustNotBeZero = "0x0";
    while (mustNotBeZero === "0x0")
    {
      try
      {
        mustNotBeZero = await gelatoCore.contract.methods.ownerOf(nextExecutionClaim).call()
      }
      catch(err)
      {
        nextExecutionClaim = nextExecutionClaim + 1
      }

    }
    assert.isTrue(true);
  })

  it("Check what function the next executable claim is", async function() {
    this.timeout(50000)
    // Get the current execution claim on the core
    for (let i = 1; i <= lastExecutionClaimId; i ++)
    {
      let canExecuteReturn = await gelatoCore.contract.methods.canExecute(i).call();
      let shouldBeZero = canExecuteReturn[0];
      if (parseInt(shouldBeZero) === 0)
      {
        nextExecutionClaim = i;
      }

    }
    console.log(`ExecutionClaimID: ${nextExecutionClaim}`)

  })

  it("fetch executionClaim payload", async() => {
    let encodedPayload = await gelatoCore.contract.methods
      .getClaimPayload(nextExecutionClaim)
      .call();
    let arrayPayload = [...encodedPayload];
    let returnedPayloadSize = "";
    let returnedFuncSelec = "";
    let returnedDataPayload = "";
    for (let i = 0; i < encodedPayload.length; i++) {
      if (i < 10) {
        returnedFuncSelec = returnedFuncSelec.concat(encodedPayload[i]);
      } else {
        returnedDataPayload = returnedDataPayload.concat(encodedPayload[i]);
      }
    }

    // console.log(`Returned Payload Size: ${returnedPayloadSize}`);
    // console.log(`Returned Payload Size: ${returnedPayloadSize.length}`);
    // console.log("---");
    // console.log(`Returned Func Selec: ${returnedFuncSelec}`);
    // console.log(`Returned Func Selec: ${returnedFuncSelec.length}`);
    // console.log("---");
    // console.log(`Returned Data Payload: ${returnedDataPayload}`);
    // console.log(
    //   `Returned Data Payload Length: ${returnedDataPayload.length}`
    // );
    // console.log("---");
    // console.log(`Returned whole encoded payload: ${encodedPayload}`);
    // console.log(
    //   `Returned whole encoded payload length: ${encodedPayload.length}`
    // );
    if (returnedFuncSelec === execDepositAndSell)
    {
      decodedPayload = web3.eth.abi.decodeParameters(
        [
          {
            type: "uint256",
            name: "_executionClaimId"
          },
          {
            type: "address",
            name: "_sellToken"
          },
          {
            type: "address",
            name: "_buyToken"
          },
          {
            type: "uint256",
            name: "_amount"
          },
          {
            type: "uint256",
            name: "_executionTime"
          },
          {
            type: "uint256",
            name: "_prepaymentPerSellOrder"
          },
          {
            type: "uint256",
            name: "_orderStateId"
          },
          {
            type: "uint256",
            name: "_newAuctionIndex"
          },
          {
            type: "bool",
            name: "_AuctionIsWaiting"
          }
        ],
        returnedDataPayload
      );
      isDepositAndSell = true;

      orderState = await gelatoDutchExchange.contract.methods.orderStates(decodedPayload._orderStateId).call()

      // console.log("Decoded Payload: decodedPayload ", decodedPayload);

    }
    else if (returnedFuncSelec === execWithdraw)
    {
      decodedPayload = web3.eth.abi.decodeParameters(
        [
          {
            type: "uint256",
            name: "_executionClaimId"
          },
          {
            type: "address",
            name: "_sellToken"
          },
          {
            type: "address",
            name: "_buyToken"
          },
          {
            type: "uint256",
            name: "_amount"
          },
          {
            type: "uint256",
            name: "_lastAuctionIndex"
          }
        ],
        returnedDataPayload
      );
      isDepositAndSell = false

      orderState = false

      // console.log("Decoded Payload: decodedPayload ", decodedPayload);
    }

  })

  it("Check if execution claim is executable based on its execution Time, if not, test that execution reverts and fast forward", async () => {

    if (isDepositAndSell)
    {

      let sellOrderExecutionTime = decodedPayload._executionTime

      // Fetch time
      let blockNumber = await web3.eth.getBlockNumber();
      let block = await web3.eth.getBlock(blockNumber);
      let beforeTimeTravel = block.timestamp;

      let secondsUntilExecution  = sellOrderExecutionTime - beforeTimeTravel

      // console.log(`
      //              Claim is executable at: ${sellOrderExecutionTime}.
      //              Current Time: ${beforeTimeTravel}
      //              Difference: ${secondsUntilExecution}`);

      // If execution Time of claim is in the future, we execute and expect a revert and then fast forward in time to the execution time
      if(parseInt(secondsUntilExecution) > 0)
      {

        let canExecuteReturn = await gelatoCore.contract.methods.canExecute(nextExecutionClaim).call()
        let returnStatus = canExecuteReturn[0].toString(10)
        let dappInterfaceAddress = canExecuteReturn[1].toString(10)
        let payload = canExecuteReturn[2].toString(10)
        // console.log(`
        //   Return Status: ${returnStatus}
        //   dappInterfaceAddress: ${dappInterfaceAddress}
        //   payload: ${payload}
        //   `)
        assert.equal(parseInt(returnStatus), 1);

        // Execution should revert
        // Gas price to calc executor payout
        let txGasPrice = await web3.utils.toWei("5", "gwei");
        await truffleAssert.reverts(
          gelatoCore.contract.methods
            .execute(nextExecutionClaim)
            .send({ from: revertExecutor, gas: 1000000, gasPrice: txGasPrice }),
          "canExec func did not return 0"
        ); // gas needed to prevent out of gas error

        // fast forward
        await timeTravel.advanceTimeAndBlock(secondsUntilExecution);
        // console.log(`Time travelled ${secondsUntilExecution} seconds`)

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

  it(`estimates GelatoCore.execute() gasUsed and logs gasLimit`, async () => {
    // Get and log estimated gasUsed by splitSellOrder fn
    gelatoCore.contract.methods.execute(nextExecutionClaim).estimateGas(
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
          // console.log(`\t\tgasLimit:           ${block.gasLimit}`);
          // console.log(`\t\testimated gasUsed:   ${estimatedGasUsed}`);
        }
      }
    );
    // This test just tried to get and log the estimate
    assert(true);
  });

  it("Check that seller is owner of execution Claim", async() => {
    let fetchedSeller = await gelatoCore.contract.methods.ownerOf(nextExecutionClaim).call()
    assert.equal(fetchedSeller.toString(), seller, "Execution Claim owner should be equal to predefined seller");
  })



  // it("Check that the past auction cleared and a price has been found", async() => {
  //   if ( withdrawClaim === nextExecutionClaim )
  //   {
  //     let orderStateId = sellOrder.orderStateId;
  //     let orderState = await gelatoDutchExchange.contract.methods.orderStates(orderStateId).call()
  //     let lastAuctionIndex = orderState.lastAuctionIndex;
  //     // Check if auction cleared with DutchX Getter
  //     let returnValue = await dxGetter.contract.methods.getClosingPrices(sellToken.address, buyToken.address, lastAuctionIndex).call();
  //     console.log(`Den: ${returnValue[1]}`)
  //     let shouldNotBeZero = parseInt(returnValue[1]) !== 0
  //     assert.isTrue(shouldNotBeZero);
  //   }
  // })

  it("Check if the execution claim is executable calling canExec in core", async () => {
    let canExecuteReturn = await gelatoCore.contract.methods.canExecute(nextExecutionClaim).call()
    let returnStatus = canExecuteReturn[0].toString(10)
    let dappInterfaceAddress = canExecuteReturn[1].toString(10)
    let payload = canExecuteReturn[2].toString(10)
    // console.log(`
    //   Return Status: ${returnStatus}
    //   dappInterfaceAddress: ${dappInterfaceAddress}
    //   payload: ${payload}
    //   `)
    assert.equal(parseInt(returnStatus[0]), 0);
  })

  it("Successfully execute execution claim", async () => {
    // Fetch executor pre Balance
    let executorBalancePre = new BN(await web3.eth.getBalance(executor));

    // Fetch ERCO balancebefore
    let sellerTokenBalanceBeforeBN = new BN(await buyToken.contract.methods.balanceOf(seller).call())

    let gdxGelatoBalanceBefore = new BN(await gelatoCore.contract.methods.getInterfaceBalance(gelatoDutchExchange.address).call())

    // Gas price to calc executor payout
    let txGasPrice = await web3.utils.toWei("5", "gwei");
    function execute() {
      return new Promise(async (resolve, reject) => {
        await gelatoCore.contract.methods
          .execute(nextExecutionClaim)
          .send(
            { from: executor, gas: 2000000, gasPrice: txGasPrice },
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

    let gdxGelatoBalanceAfter = new BN(await gelatoCore.contract.methods.getInterfaceBalance(gelatoDutchExchange.address).call())

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

    // console.log(`
    //   Total Gas returned from contract: ${totalGasUsed}
    //   Cummulative Tx Gas consumed: ${execTxReceipt.cumulativeGasUsed}
    //   Tx Gas consumed: ${execTxReceipt.gasUsed}
    //   usedGasPrice: ${usedGasPrice}
    //   executorPayout: ${executorPayout}
    // `)


    amountReceivedByExecutor = new BN(executorPayout)

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
    let executorMadeProfit = executorBalancePost.gte(executorBalancePre)
    assert.isTrue(executorMadeProfit, "Executor should make a profit executing the transcation")

    // #### CHECKS FOR BOTH FUNCTIONS ####

    // Fetch past events of gelatoDutchExchange
    await gelatoDutchExchange.getPastEvents(
      "LogActualSellAmount",
      (error, events) => {
        // console.log(events);
      }
    );

    let consumedGas1;
    let consumedGas2;
     // CHECK IF Execution failed or not
     await gelatoCore.getPastEvents(
      "LogGasConsumption",
      (error, events) => {
        consumedGas1 = events[0].returnValues.gasConsumed
      }
    );

    console.log(`----------------

    Was execution claim minted?

    `)
    // CHECK IF NEW EXECUTION CLAIM WAS MINTED
    // await gelatoCore.getPastEvents(
    //   "LogNewExecutionClaimMinted",
    //   (error, events) => {
    //     console.log(events);
    //   }
    // );

    console.log(`---------------
      Check if execute resulted in true

    `)
    // CHECK IF Execution failed or not
    // await gelatoCore.getPastEvents(
    //   "ExecuteResult",
    //   (error, events) => {
    //     console.log(events);
    //   }
    // );


    // CHECK IF Execution failed or not
    await gelatoCore.getPastEvents(
      "LogGasConsumption",
      (error, events) => {
        consumedGas2= events[1].returnValues.gasConsumed
      }
    );


    console.log(`
      Consumed Gas: ${consumedGas1 - consumedGas2}
    `)
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

    let sellerTokenBalanceAfterBN = new BN(await buyToken.contract.methods.balanceOf(seller).call());
    let receivedBuyTokens = sellerTokenBalanceAfterBN.sub(sellerTokenBalanceBeforeBN);

    let sellAmount = decodedPayload._amount;

    // Order state already fetched
    let AuctionIndex;
    if (isDepositAndSell)
    {
      lastAuctionIndex = orderState.lastAuctionIndex;
    }
    else
    {
      lastAuctionIndex = decodedPayload._lastAuctionIndex

    }

    let closingPrice1 = await dxGetter.contract.methods.getClosingPricesOne(sellToken.address, buyToken.address, lastAuctionIndex).call()

    let num = new BN(closingPrice1[0].toString())
    let den = new BN(closingPrice1[1].toString())
    // console.log(`
    // Num: ${closingPrice1[0].toString()}
    // Den: ${closingPrice1[1].toString()}
    // `)

    let buyTokenReceivable = new BN(sellAmount).mul(num).div(den)
    // console.log(`
    // Balance After: ${sellerTokenBalanceAfterBN.toString()}
    // Balance Accurate ${buyTokenReceivable.toString()}
    // `)

    if (!isDepositAndSell)
    {
      let buyTokenAmountIsEqual = buyTokenReceivable.eq(receivedBuyTokens)

      assert.isTrue(buyTokenAmountIsEqual, `Buy Tokens received ${receivedBuyTokens.toString()} should == ${buyTokenReceivable.toString()}`)

    }



    // console.log('Closing Prices: num ', num);
    // console.log('Closing Prices: den ', den);

    // console.log('Sell Amount: sellAmount ', sellAmount);

    // console.log('Received Tokens: receivedBuyTokens ', receivedBuyTokens.toString());

    // #### CHECKS FOR WHEN execWithdraw gets called END ####


    // #### CHECKS FOR WHEN execDepositAndSell gets called ####

    // Check if we did an automated top up
    await gelatoDutchExchange.getPastEvents("LogAddedBalanceToGelato", (error, events) => {
      if (events[0] === undefined)
      {
        amountDeductedfromInterface = gdxGelatoBalanceBefore.sub(gdxGelatoBalanceAfter);
      //   console.log(`
      // GelatoBalanceBefore: ${gdxGelatoBalanceBefore.toString()}
      // GelatoBalanceAfter: ${gdxGelatoBalanceAfter.toString()}`)
      }
      else
      {
        amountDeductedfromInterface = gdxGelatoBalanceBefore.sub(gdxGelatoBalanceAfter).add(new BN(events[0].returnValues.weiAmount));
      //   console.log(`
      // GelatoBalanceBefore: ${gdxGelatoBalanceBefore.toString()}
      // GelatoBalanceAfter: ${gdxGelatoBalanceAfter.toString()}
      // InterfaceEthBalance: ${events[0].returnValues.weiAmount}`)

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
    // console.log(`
    //   Amount Received: ${amountReceivedByExecutor.toString()}
    //   Amount Deducted interface: ${amountDeductedfromInterface.toString()}`)
    assert.isTrue(payoutWasEqual, "Payout to executor equals amount deducted from interface balance")

  })

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
        Difference:           ${(userEthBalanceAfter - userEthBalance) / 10 ** 18} ETH

        WETH Balance Before:  ${userSellTokenBalance / 10 ** 18} WETH
        WETH Balance After:   ${userSellTokenBalanceAfter / 10 ** 18} WETH
        -----------
        Difference:           ${(userSellTokenBalanceAfter - userSellTokenBalance) / 10 ** 18} WETH

        ICE Balance Before:   ${userBuyTokenBalance / 10 ** 18} ICE🍦
        ICE Balance After:    ${userBuyTokenBalanceAfter / 10 ** 18} ICE🍦
        -----------
        Difference:           ${(userBuyTokenBalanceAfter  - userBuyTokenBalance) / 10 ** 18} ICE🍦

      EXECUTOR BALANCE:
        ETH Balance Before:   ${executorEthBalance / 10 ** 18} ETH
        ETH Balance After:    ${executorEthBalanceAfter / 10 ** 18} ETH
        -----------
        Difference:           ${(executorEthBalanceAfter - executorEthBalance) / 10 ** 18} ETH

      ***************************************************+

    `);

    assert.isTrue(true);
  });



  // Check balance of gelatoDutchExchange pre vs post in eth in own SC

  // Check if core emmited correct events such as LogClaimExecutedBrunedAndDeleted

  // Check that an executor can call execute with the same claimId again to drain the interface

  // Check that sellOrder in interface got updated correcty
});
