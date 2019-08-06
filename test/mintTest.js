// Minting Test

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

describe("Test the successful setup of gelatoDutchExchangeInterface (gdx)", () => {
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
    seller = accounts[2]; // account[2]
  });

  it("Seller approves GDX for TOTAL_SELL_AMOUNT", async () => {
    await sellToken.contract.methods
      .approve(gelatoDutchExchange.address, TOTAL_SELL_VOLUME)
      .send({ from: seller });

    const allowance = await sellToken.contract.methods
      .allowance(seller, gelatoDutchExchange.address)
      .call();

    assert.strictEqual(
      allowance,
      TOTAL_SELL_VOLUME,
      `The ERC20 ${
        sellToken.address
      } allowance for the GelatoDXSplitsellAndWithdraw should be at ${TOTAL_SELL_VOLUME}`
    );
  });

  it("Mint 4 execution claims with 2 sell orders on GDX while checking user & interface balance", async () => {
    // Getch gelatoDutchExchange balance
    let gelatoCoreBalancePre = new BN(
      await web3.eth.getBalance(gelatoDutchExchange.address)
    );

    let sellerBalancePre = new BN(await web3.eth.getBalance(seller));

    let sellerERCBalancePre = await sellToken.contract.methods
      .balanceOf(seller)
      .call();

    // Now set the executiontime
    blockNumber = await web3.eth.getBlockNumber();
    block = await web3.eth.getBlock(blockNumber);
    timestamp = block.timestamp;
    executionTime = timestamp + 15; // must be >= now (latency)

    // Seller external TX2:
    // benchmarked gasUsed = 726,360 (for 2 subOrders + 1 lastWithdrawal)
    let txGasPrice = await web3.utils.toWei("5", "gwei");
    await gelatoDutchExchange.contract.methods
      .timeSellOrders(
        sellToken.address,
        buyToken.address,
        TOTAL_SELL_VOLUME,
        NUM_SUBORDERS_BN.toString(),
        SUBORDER_SIZE_BN.toString(),
        executionTime,
        INTERVAL_SPAN
      )
      .send({
        from: seller,
        value: MSG_VALUE_BN,
        gas: 2000000,
        gasPrice: txGasPrice
      }) // gas needed to prevent out of gas error
      .once("transactionHash", hash => (txHash = hash))
      .once("receipt", receipt => (txReceipt = receipt))
      .on("error", console.error);

    // Check that gelatoCore has received msg.value funds in its balance
    let gelatoCoreBalancePost = new BN(
      await web3.eth.getBalance(gelatoDutchExchange.address)
    );

    // Calc how much the core ower paid for the tx
    let sellerTxCost = txGasPrice * txReceipt.gasUsed;
    let sellerTxCostBN = new BN(sellerTxCost);
    // SET GAS PRICE

    // CHECK that core owners ETH balance decreased by 1 ETH + tx fees
    // Sellers ETH Balance post mint
    let sellerBalancePost = new BN(await web3.eth.getBalance(seller));

    // calc seller ETH spent
    let sellerBalanceChangedCorrectly = sellerBalancePre
      .sub(MSG_VALUE_BN)
      .sub(sellerTxCostBN)
      .eq(sellerBalancePost);

    let sellerERCBalancePost = await sellToken.contract.methods
      .balanceOf(seller)
      .call();

    // Check GDX ETH balance pre post
    assert.strictEqual(
      gelatoCoreBalancePost.toString(),
      gelatoCoreBalancePre.add(MSG_VALUE_BN).toString(),
      "gelatoCore ether balance gelatoCoreproblem"
    );

    // Check seller ETH balance pre post
    assert.isTrue(
      sellerBalanceChangedCorrectly,
      "gelatoCore ether balance core Owner problem"
    );

    // Check seller ERC20 balance pre post
    assert.strictEqual(
      sellerERCBalancePost,
      new BN(sellerERCBalancePre).sub(new BN(TOTAL_SELL_VOLUME)).toString(),
      "gelatoCore ERC20 balance problem"
    );

    // Fetch current counter
    let lastExecutionClaimId = await gelatoCore.contract.methods
      .getCurrentExecutionClaimId()
      .call();

    // Fetch Event: LogNewExecutionClaimMinted
    let firstExecutionClaimId = lastExecutionClaimId - numberOfSubOrders * 2;
    await gelatoCore.getPastEvents(
      "LogNewExecutionClaimMinted",
      (error, events) => {
        events.forEach(async event => {
          // Fetch current executionClaimId
          firstExecutionClaimId = firstExecutionClaimId + 1;
          assert.strictEqual(
            event.returnValues.dappInterface,
            gelatoDutchExchange.address,
            "LogExecutionClaimMinted dappInterface problem"
          );
          let executionClaimIdsEqual = new BN(
            event.returnValues.executionClaimId
          ).eq(new BN(firstExecutionClaimId));

          assert.isTrue(
            executionClaimIdsEqual,
            "LogExecutionClaimMinted executionClaimId problem"
          );
          let returnedFuncSig = event.returnValues.functionSignature;
          if (parseInt(event.returnValues.executionClaimId) % 2 !== 0) {
            assert.strictEqual(
              returnedFuncSig,
              await web3.eth.abi.encodeFunctionCall(
                {
                  name: "execDepositAndSell",
                  type: "function",
                  inputs: [
                    {
                      type: "uint256",
                      name: "_executionClaimId"
                    }
                  ]
                },
                returnedFuncSig
              ),
              "LogExecutionClaimMinted functionSignature problem"
            );
          } else {
            assert.strictEqual(
              returnedFuncSig,
              await web3.eth.abi.encodeFunctionCall(
                {
                  name: "execWithdraw",
                  type: "function",
                  inputs: [
                    {
                      type: "uint256",
                      name: "_executionClaimId"
                    }
                  ]
                },
                returnedFuncSig
              ),
              "LogExecutionClaimMinted functionSignature problem"
            );
          }
        });
      }
    );
  });
});

describe("Should not be able to mint when tokens not traded on the dutchX", () => {
  it("Check that timeSellOrders() reverts when a non existing token is chosen", async function() {
    this.timeout(50000);
    let ERC20 = artifacts.require("ERC20");
    // Deploy 1 new ERC20
    let newBuyToken = await ERC20.new();

    // Check current auction index on DX GETTER
    // console.log(buyToken.address)
    // console.log(newBuyToken.address)
    // let index1 = await dxGetter.contract.methods.getAuctionIndex(sellToken.address, buyToken.address).call()
    // let index2 = await dxGetter.contract.methods.getAuctionIndex(sellToken.address, newBuyToken.address).call()

    // Now set the executiontime
    blockNumber = await web3.eth.getBlockNumber();
    block = await web3.eth.getBlock(blockNumber);
    timestamp = block.timestamp;
    let testExecutionTime = timestamp + 15; // must be >= now (latency)

    // Seller external TX2:
    // benchmarked gasUsed = 726,360 (for 2 subOrders + 1 lastWithdrawal)

    // Call should revert
    await truffleAssert.reverts(
      gelatoDutchExchange.timeSellOrders(
        sellToken.address,
        newBuyToken.address,
        TOTAL_SELL_VOLUME,
        NUM_SUBORDERS_BN.toString(),
        SUBORDER_SIZE_BN.toString(),
        testExecutionTime,
        INTERVAL_SPAN,
        { from: seller, value: MSG_VALUE_BN, gas: 2000000 }
      ),
      "The selected tokens are not traded on the Dutch Exchange"
    );
    assert.isTrue(true);
  });
});

describe("Check gelatoDutchExchange Interface orderState and sellOrder Values", () => {
  it("Check orderState values", async () => {
    // emitted event on GELATO_DX: LogNewOrderCreated(orderId, seller)
    assert.ok(
      txReceipt.events.LogNewOrderCreated,
      "LogNewOrderCreated event does not exist"
    );

    // check if event has correct return values
    assert.strictEqual(
      txReceipt.events.LogNewOrderCreated.returnValues.seller,
      seller,
      "LogNewOrderCreated event seller problem"
    );

    // save the orderId
    orderStateId =
      txReceipt.events.LogNewOrderCreated.returnValues.orderStateId;

    assert.strictEqual(
      txReceipt.events.LogNewOrderCreated.returnValues.orderStateId,
      orderStateId,
      "LogNewOrderCreated orderStateId problem"
    );

    // fetch the newly created orderState on GELATO_DX
    orderState = await gelatoDutchExchange.contract.methods
      .orderStates(orderStateId)
      .call();

    // check the orderState
    assert.strictEqual(
      orderState.lastAuctionWasWaiting,
      false,
      "orderState.lastAuctionWasWaiting problem"
    );
    assert.strictEqual(
      orderState.lastAuctionIndex,
      "0",
      "orderState.lastAuctionIndex problem"
    );

    let gdxPrepayment = await gelatoDutchExchange.contract.methods
      .calcGelatoPrepayment()
      .call();
    assert.strictEqual(
      orderState.prePaymentPerSellOrder,
      gdxPrepayment,
      "prePayment Problem"
    );
  });
  it("Check sellOrder values", async () => {
    let lastExecutionClaimId = await gelatoCore.contract.methods
      .getCurrentExecutionClaimId()
      .call();
    let firstExecutionClaimId =
      parseInt(lastExecutionClaimId) - parseInt(numberOfSubOrders) * 2;
    let assertExecutionTime = executionTime;
    assertExecutionTimeBN = new BN(assertExecutionTime);

    while (firstExecutionClaimId < parseInt(lastExecutionClaimId)) {
      firstExecutionClaimId = firstExecutionClaimId + 1;
      if (firstExecutionClaimId % 2 !== 0) {
        let sellOrder = await gelatoDutchExchange.contract.methods
          .sellOrders(firstExecutionClaimId)
          .call();
        // OrderState Id must be correct
        assert.strictEqual(
          sellOrder.orderStateId,
          orderStateId,
          "Order State Id Problem in sellOrder"
        );

        // Execution Time must be correct
        let fetchedExecutionTime = new BN(sellOrder.executionTime);
        let executionTimeIsEqual = assertExecutionTimeBN.eq(
          fetchedExecutionTime
        );
        assert.isTrue(
          executionTimeIsEqual,
          `ExecutionTime Problem: ${assertExecutionTimeBN.toString()}needs to be equal ${fetchedExecutionTime.toString()}`
        );

        // Amount must be correct
        let amountIsEqual = SUBORDER_SIZE_BN.eq(new BN(sellOrder.amount));
        assert.isTrue(amountIsEqual, "Amount Problem in sellOrder");

        // Sold should be false by default
        assert.strictEqual(
          sellOrder.sold,
          false,
          "Sold (bool) Problem in sellOrder"
        );

        // Account for next iteration
        assertExecutionTimeBN = assertExecutionTimeBN.add(
          new BN(INTERVAL_SPAN)
        );
      }
    }
  });
  it("Pair Ids should map to the same sellOrderStruct", async () => {
    let lastExecutionClaimId = await gelatoCore.contract.methods
      .getCurrentExecutionClaimId()
      .call();
    let firstExecutionClaimId =
      parseInt(lastExecutionClaimId) - parseInt(numberOfSubOrders) * 2;

    let assertExecutionTime = executionTime;
    assertExecutionTimeBN = new BN(assertExecutionTime);

    while (firstExecutionClaimId < parseInt(lastExecutionClaimId)) {
      // skip zero id
      firstExecutionClaimId = firstExecutionClaimId + 1;
      // ExecDepositAndSell Id
      let sellOrder1 = await gelatoDutchExchange.contract.methods
        .sellOrders(firstExecutionClaimId)
        .call();
      // execWithdraw Id
      // FETCH THE SELLORDER FIRST
      let sellOrderId = await gelatoDutchExchange.contract.methods.sellOrderLink(firstExecutionClaimId + 1).call()
      let sellOrder2 = await gelatoDutchExchange.contract.methods
        .sellOrders(sellOrderId.toString())
        .call();
      console.log(`First execution Claim: ${firstExecutionClaimId}`)
      console.log('Sell Order 1: ', sellOrder1)
      console.log('Sell Order 2: ', sellOrder2)
      console.log('Sell Order ID: ', sellOrder2)
      // skip to next depositAndSell id
      assert.strictEqual(
        sellOrder1.executionTime,
        sellOrder2.executionTime,
        "Sell Orders executionTime must be equal"
      );

      assert.strictEqual(
        sellOrder1.amount,
        sellOrder2.amount,
        "Sell Orders amount should be equal"
      );

      firstExecutionClaimId = firstExecutionClaimId + 1;
    }
  });
});
