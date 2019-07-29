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
  executeTestScript,
  DxGetter
} = require("./truffleTestConfig.js");

describe("deploy new dxInterface Contract and fetch address", () => {
  // ******** Deploy new instances Test ********
  before(async () => {
    gelatoDutchXContract = await GelatoDutchX.deployed();
    dutchExchangeProxy = await DutchExchangeProxy.deployed();
    dutchExchange = await DutchExchange.deployed();
    gelatoCore = await GelatoCore.deployed();
    sellToken = await SellToken.deployed();
    buyToken = await BuyToken.deployed();
    dxGetter = await DxGetter.deployed();
    gelatoCoreOwner = await gelatoCore.contract.methods.owner().call();
    accounts = await web3.eth.getAccounts();
    seller = accounts[2]; // account[2]
  });

  it("seller is 0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef", async () => {
    assert.strictEqual(seller, "0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef");
  });

  // ******** listInterface tests ********
  it(`lets Core-owner list gelatoInterface on GelatoCore with its maxGas set`, async () => {
    await gelatoCore.contract.methods
      .listInterface(gelatoDutchXContract.address, MAXGAS)
      .send({ from: gelatoCoreOwner });

    let isWhitelisted = await gelatoCore.contract.methods
      .getInterfaceWhitelist(gelatoDutchXContract.address)
      .call();
    let maxGas = await gelatoCore.contract.methods
      .getInterfaceMaxGas(gelatoDutchXContract.address)
      .call(); // uint256

    assert.isTrue(isWhitelisted);
    assert.equal(MAXGAS, maxGas);
  });

  it("sellToken is sellToken", async () => {
    assert.equal(
      "0xAa588d3737B611baFD7bD713445b314BD453a5C8",
      sellToken.address,
      `0xAa588d3737B611baFD7bD713445b314BD453a5C8 is not equal ${
        sellToken.address
      }`
    );
  });

  // ******** MINT CLAIMS - SPLIT SELL ORDER ********

  // ******** Seller ERC20 approves the GDXSSAW for TotalSellVolume ********
  it(`CHECK APPROVAL for the TOTAL_SELL_VOLUME`, async () => {
    await sellToken.contract.methods
      .approve(gelatoDutchXContract.address, TOTAL_SELL_VOLUME)
      .send({ from: seller });

    const allowance = await sellToken.contract.methods
      .allowance(seller, gelatoDutchXContract.address)
      .call();

    assert.strictEqual(
      allowance,
      TOTAL_SELL_VOLUME,
      `The ERC20 ${
        sellToken.address
      } allowance for the GelatoDXSplitsellAndWithdraw should be at ${TOTAL_SELL_VOLUME}`
    );
  });

  // ******** seller calls splitSellOrder() ********
  it(`successfully create a new splitSellOrder`, async () => {
    // First get gelatoCore's balance pre executionClaim minting
    let gelatoCoreBalancePre = new BN(
      await web3.eth.getBalance(gelatoCore.address)
    );
    // Second set the executiontime
    let blockNumber = await web3.eth.getBlockNumber();
    let block = await web3.eth.getBlock(blockNumber);
    let timestamp = block.timestamp;
    executionTime = timestamp + 15;

    // benchmarked gasUsed = 726,360 (for 2 subOrders + 1 lastWithdrawal)
    await gelatoDutchXContract.contract.methods
      .splitSellOrder(
        sellToken.address,
        buyToken.address,
        TOTAL_SELL_VOLUME,
        NUM_SUBORDERS_BN.toString(),
        SUBORDER_SIZE_BN.toString(),
        executionTime,
        INTERVAL_SPAN.toString()
      )
      .send({ from: seller, value: MSG_VALUE_BN, gas: 1000000 }) // gas needed to prevent out of gas error
      .once("transactionHash", hash => (txHash = hash))
      .once("receipt", receipt => (txReceipt = receipt))
      .on("error", console.error);

    // Fetch events
    await gelatoCore
      .getPastEvents("LogNewExecutionClaimMinted", (error, events) =>
        console.log(error)
      )
      .then(events => {
        events.forEach(event => {
          executionClaimIds.push(event.returnValues["executionClaimId"]);
        });
      });

    await gelatoDutchXContract
      .getPastEvents("LogNewOrderCreated", (error, events) =>
        console.log(error)
      )
      .then(events => {
        events.forEach(event => {
          interfaceOrderId = event.returnValues["orderId"];
        });
      });

    // Check that gelatoCore has received msg.value funds in its balance
    let gelatoCoreBalancePost = new BN(
      await web3.eth.getBalance(gelatoCore.address)
    );
    assert.strictEqual(
      gelatoCoreBalancePost.toString(),
      gelatoCoreBalancePre.add(MSG_VALUE_BN).toString()
    );

    // emitted event on Interface: LogNewOrderCreated(orderId, seller)
    assert.exists(txReceipt.events.LogNewOrderCreated);

    // save the orderId
    orderId = txReceipt.events.LogNewOrderCreated.returnValues.orderId;

    // fetch the newly created orderState on GDXSSAW
    orderState = await gelatoDutchXContract.contract.methods
      .orderStates(orderId)
      .call();

    // check the orderState
    assert.isFalse(orderState.lastAuctionWasWaiting);
    assert.strictEqual(orderState.lastAuctionIndex, "0");
    assert.strictEqual(
      orderState.remainingSubOrders,
      NUM_SUBORDERS_BN.toString()
    );
    assert.strictEqual(orderState.lastSellAmountAfterFee, "0");
    assert.strictEqual(
      orderState.remainingWithdrawals,
      NUM_SUBORDERS_BN.toString()
    );

    // Log actual gasUsed
    console.log("\t\tactual gasUsed:     ", txReceipt.gasUsed);

    // Save transactions blockNumber for next event emission test
    blockNumber = txReceipt.blockNumber;
  });

  // it("query auction index", async () => {
  //   let auctionIndex = await dutchExchange.getAuctionIndex(sellToken.address, buyToken.address)
  //   console.log(auctionIndex.toString());
  // })

  it("Successfully time travel 6 hours", async () => {
    // Second set the executiontime
    let blockNumber = await web3.eth.getBlockNumber();
    let block = await web3.eth.getBlock(blockNumber);
    let timestamp = block.timestamp;

    let seconds = 21600; // 6 hours
    // fast forward 6h
    await timeTravel.advanceTimeAndBlock(seconds);

    let blockNumber2 = await web3.eth.getBlockNumber();
    let block2 = await web3.eth.getBlock(blockNumber2);
    let timestamp2 = block2.timestamp;

    let timestampBN = new BN(timestamp);
    let timestamp2BN = new BN(timestamp2);
    let secondsBN = new BN(seconds);
    let futureTimeBN = timestampBN.add(secondsBN);

    // BN assert
    // future time should be greater or equal to seconds + oldtimestamp
    let timeTravelSuccess = timestamp2BN.gte(futureTimeBN);

    assert.isTrue(
      timeTravelSuccess,
      ` ${timestamp2} should be >= to ${timestamp + seconds}`
    );
  });

  it("Execution claim is executable based on its execution Time", async () => {
    let blockNumber = await web3.eth.getBlockNumber();
    let block = await web3.eth.getBlock(blockNumber);
    let now = block.timestamp;

    let claimsExecutionTime = await gelatoCore.getClaimExecutionTime(
      executionClaimIds[0]
    );
    // Check if execution claim is executable
    // assert.equal(executionTime + 15, claimsExecutionTime.toString(), `${claimsExecutionTime} should be equal to the execution time we set + 15 seconds`)

    let claimsExecutionTimeBN = new BN(claimsExecutionTime.toString());
    let nowBN = new BN(now);
    let claimIsExecutable = nowBN.gte(claimsExecutionTimeBN);
    // Check if execution claim is executable
    assert.isTrue(
      claimIsExecutable,
      `${now} should be greater than ${claimsExecutionTime.toString()}`
    );
  });
});
