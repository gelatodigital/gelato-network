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
        executor = accounts[8]; // account[2]
    });


    it("Execution should revert() when function call returns success == false", async () => {
        let lastExecutionClaimId = await gelatoCore.contract.methods
        .getCurrentExecutionClaimId()
        .call();
        let firstExecutionClaimId =
        parseInt(lastExecutionClaimId) - (parseInt(numberOfSubOrders) * 2) + 1;

        // Fetch executor pre Balance
        let executorBalancePre = new BN(await web3.eth.getBalance(executor));

        // Gas price to calc executor payout
        let txGasPrice = await web3.utils.toWei("5", "gwei");
        console.log(`Claim ID: firstExecutionClaimId}`)
        await truffleAssert.reverts(gelatoCore.contract.methods
        .execute(firstExecutionClaimId)
        .send({ from: executor, gas: 1000000, gasPrice: txGasPrice }), "Execution of dappInterface function must be successful") // gas needed to prevent out of gas error
    });


    it("Execution claim is executable based on its execution Time", async () => {
        let seconds = 1200; // 20 min
        // fast forward
        await timeTravel.advanceTimeAndBlock(seconds);

        // Fetch time
        let blockNumber = await web3.eth.getBlockNumber();
        let block = await web3.eth.getBlock(blockNumber);
        let now = block.timestamp;

        let sellOrder = await gelatoDutchExchange.contract.methods.sellOrders(
          1
        ).call()
        // Check if execution claim is executable
        // assert.equal(executionTime + 15, claimsExecutionTime.toString(), `${claimsExecutionTime} should be equal to the execution time we set + 15 seconds`)
        console.log(`ExecutionTime: ${sellOrder.executionTime}`)
        let claimsExecutionTimeBN = new BN(sellOrder.executionTime.toString());
        let nowBN = new BN(now);
        let claimIsExecutable = nowBN.gte(claimsExecutionTimeBN);
        console.log(`Claim is executable: ${sellOrder.executionTime}. Now: ${now}`)
        // Check if execution claim is executable
        assert.isTrue(
          claimIsExecutable,
          `${now} should be greater than ${claimsExecutionTimeBN.toString()}`
        );
    });

    it(`estimates GelatoCore.execute() gasUsed and logs gasLimit`, async () => {

        // Get and log estimated gasUsed by splitSellOrder fn
        gelatoCore.contract.methods.execute(1).estimateGas(
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


    it("Successfully execute first execution claim", async() => {
        let lastExecutionClaimId = await gelatoCore.contract.methods
        .getCurrentExecutionClaimId()
        .call();
        let firstExecutionClaimId =
        parseInt(lastExecutionClaimId) - (parseInt(numberOfSubOrders) * 2) + 1;

        // Fetch executor pre Balance
        let executorBalancePre = new BN(await web3.eth.getBalance(executor));

        // Gas price to calc executor payout
        let txGasPrice = await web3.utils.toWei("5", "gwei");
        console.log(`Claim ID: firstExecutionClaimId}`)
        function execute() {
            return new Promise(async (resolve, reject) => {
              await gelatoCore.contract.methods
                .execute(firstExecutionClaimId)
                .send({ from: executor, gas: 1000000, gasPrice: txGasPrice }, (error, hash) => {
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
        console.log(txReceipt)

        let executorTxCost = txGasPrice * txReceipt.gasUsed;
        let executorTxCostBN = new BN(executorTxCost);

        // CHECK that core owners ETH balance decreased by 1 ETH + tx fees
        // Sellers ETH Balance post mint
        let executorBalancePost = new BN(await web3.eth.getBalance(executor));

        // Fetch reward specified in gelatoCore
        console.log(`Pre Balance: ${executorBalancePre}`)
        console.log(`Post Balance: ${executorBalancePost}`)

        // calc seller ETH spent
        // let executorBalanceChangedCorrectly = sellerBalancePre
        // .add(MSG_VALUE_BN)
        // .sub(executorTxCostBN)
        // .eq(executorBalancePost);
        await gelatoDutchExchange.getPastEvents("LogActualSellAmount", (error, events) => {
            console.log(events);
        })
    })

  })