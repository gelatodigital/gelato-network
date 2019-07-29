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
require("dotenv").config();

describe("successfully executes claim", () => {
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

  it("Successfully conduct a manual withdraw", async function() {
    let copyEnv = [
      ...process.env["EXECUTION_CLAIM"],
      process.env["CLAIM_STATE_ID"]
    ];
    // Execute first claim
    let executionClaim = copyEnv[0];
    let orderStateId = copyEnv[1];

    const balanceBefore = await buyToken.balanceOf(seller);

    let txReceipt = await gelatoDutchXContract.contract.methods
      .withdrawManually(executionClaim)
      .send({ from: seller, gas: 1000000 });

    let balanceAfter = await buyToken.balanceOf(seller);

    assert.exists(txReceipt, "manual withdraw function has to go through");


    let numInterface;
    let denInterface
    let withdrawAmountInterface;
    await gelatoDutchXContract.getPastEvents("LogWithdrawAmount", (error, events) => {
      if (error) {console.log(error)}
      if (events) {
        numInterface = events[0].returnValues.num
        denInterface = events[0].returnValues.den
        withdrawAmountInterface = events[0].returnValues.withdrawAmount
      }
    })

    const orderState = await gelatoDutchXContract.contract.methods
    .orderStates(orderStateId)
    .call();

    const lastAuctionIndex = orderState.lastAuctionIndex.toString();

    // ########################### DX GETTER Contract - Fetch auction closing price

    let num;
    let den;
    await dxGetter.contract.methods.getClosingPrices(
      sellToken.address,
      buyToken.address,
      lastAuctionIndex
    ).call()
    .then((result) => {
      num = result[0].toString(10);
      den = result[1].toString(10)
    })


    // ########################### DX GETTER Contract END

    // ###################### Calculate if withdraw amount was correctly calculated

    const numBN = new BN(num);
    const denBN = new BN(den);

    const lastSellAmountAfterFeeBN = new BN(orderState.lastSellAmountAfterFee.toString())

    const amountReceivable = lastSellAmountAfterFeeBN.mul(numBN).div(denBN);

    const balanceBeforeBN = new BN(balanceBefore.toString());
    const balanceAfterBN = new BN(balanceAfter.toString());

    const amountReceived = balanceAfterBN.sub(balanceBeforeBN);

    const amountsShouldEqual = amountReceived.eq(amountReceivable);

    // ###################### Calculate if withdraw amount was correctly calculated END

    assert.isTrue(
      amountsShouldEqual,
      `Amount Receivable ${amountReceivable.toString()} should equal ${amountReceived.toString()}`
    );

  });
});
