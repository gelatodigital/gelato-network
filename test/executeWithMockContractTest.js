// XX1. Write down the test scenario
// XX2. List the order of calls we conduct within the execute function to the DutchX
// XX3. Write down which values should be returned from each function call
// XX4. Write a Mock dutchX contract which has the same function names specified in 2) which returns the values specified in 3) and which employs setter to set new values
// XX5. Create a truffle test file which deploys a new instance of the gelatoDX interface with a new core and the mock contract instead of the dutchX
// XX6. Create a bash script that endows the user before executing the new test file
// XX7. Copy paste the tests which mint 3 execution claims
// XX8. You maybe have to edit the min. 6 hour interval func in order to skip forward in time. Otherwise research how we can skip time in truffle. If that does not work, use execution times that lie within the past
// XX9. Update the mockTestDxInterface script so that we successfully execute 1st claims
// 10. Make execute test modular so that we can call it again


/*

    // 1. Test scenario using Mock contract of the Execute() func

    TEST SCENARIO
    - User wants to sell 10 WETH for RDN on the DutchX twice, with an interval span of 6 hours. The execution time of the first tx is now.
    - The DutchX has a WETH-RDN auction currently running, with:
        - Auction Index 10
        - Auction Start time: now - 6 hours => Auction is running and started roughly 6h ago
        - Current price: 1WETH == 100 RND => Num === 100 && Den === 1
        - Current Fee: 0.2% => Num === 1 && Den === 500
    #1 The 1st execution should pass without a problem. Gelatos balance should be deducted by the sell amount. The claim should be burned.
    #2 Executing the second claim right after that should result in the execution time reverting
    #3 Skip ahead in time so we and test if we are at the right block
    #4 Change the DutchXMockContract values and test if they were correctly incremented
    #5 Test if the second claim can be successfully executed. The Gelato balance should be deducted by the sell amount. The users balance should be updated by the withdraw amount. The claim should be burned
    #6 Repeat #3 && ä4
    #7 Execute third tx and check if the user balance was successfully incremented

    // // 2 / 3. List the order of calls we conduct within the execute function to the DutchX

    1. dutchExchange.getAuctionIndex(buyToken, sellToken) => 10
    2. dutchExchange.getAuctionStart(sellToken, buyToken) => now - 6 hours
    3. dutchExchange.getFeeRatio(address(this)) => num: 1, den: 500 => 1 / 500 == 0,002. 10 WETH / 500 => 0,02 WETH === Fee
    4. dutchExchange.depositAndSell(_sellToken, _buyToken, _sellAmount) => true
    5. dutchExchange.closingPrices(_sellToken, _buyToken, _lastAuctionIndex) => num: 1000 amount RDN, den: 10 amount WETH => 10WETH should => 1000 RND WETH/RDN === 100RDN
    6. dutchExchange.claimAndWithdraw(_sellToken, _buyToken, address(this), _lastAuctionIndex,withdrawAmount) => true
*/

// 5. Truffle test file for the splitSellOrder

// Import Contracts
const GelatoCore = artifacts.require("GelatoCore");
const gelatoDutchX = artifacts.require("GelatoDXSplitSellAndWithdraw");
const mockExchange = artifacts.require("DutchXMock");
const SellToken = artifacts.require("EtherToken");
const BuyToken = artifacts.require("TokenRDN");
const DutchExchangeProxy = artifacts.require("DutchExchangeProxy");
const DutchExchange = artifacts.require("DutchExchange");

// Helper functions
const timeTravel = require("./helpers/timeTravel.js");

// Global variables
const MAXGAS = 400000;
const BN = web3.utils.BN;
const GELATO_GAS_PRICE_BN = new BN(web3.utils.toWei("5", "gwei"));

// Split Sell Order Details
const TOTAL_SELL_VOLUME = web3.utils.toWei("20", "ether"); // 20 WETH
const NUM_SUBORDERS_BN = new BN("2");
const SUBORDER_SIZE_BN = new BN(web3.utils.toWei("10", "ether")); // 10 WETH
const INTERVAL_SPAN = "21600"; // 6 hours
const GDXSSAW_MAXGAS_BN = new BN("400000"); // 400.000 must be benchmarked
const GELATO_PREPAID_FEE_BN = GDXSSAW_MAXGAS_BN.mul(GELATO_GAS_PRICE_BN); // wei
// MSG_VALUE_BN needs .add(1) in GDXSSAW due to offset of last withdrawal executionClaim
const MSG_VALUE_BN = GELATO_PREPAID_FEE_BN.mul(NUM_SUBORDERS_BN.add(new BN(1))); // wei

let dutchExchangeProxy;
let dutchExchange;
let seller;
let accounts;
let sellToken;
let buyToken;
let mockExchangeContract;
let gelatoDutchXContract;
let gelatoCore;
let gelatoCoreOwner;
let orderId;
let orderState;
let executionTime;
let interfaceOrderId;
// Fetch the claim Ids
const executionClaimIds = [];

describe("deploy new dxInterface Contract and fetch address", () => {
  // ******** Deploy new instances Test ********
  before(async () => {
    mockExchangeContract = await mockExchange.new();
    // gelatoDutchXContract = await gelatoDutchX.new(
    //   GelatoCore.address,
    //   mockExchangeContract.address
    // );

    gelatoDutchXContract = await gelatoDutchX.deployed()
    dutchExchangeProxy = await DutchExchangeProxy.deployed()
    dutchExchange = await DutchExchange.deployed()
    gelatoCore = await GelatoCore.deployed();
    sellToken = await SellToken.deployed();
    buyToken = await BuyToken.deployed();
    gelatoCoreOwner = await gelatoCore.contract.methods.owner().call();
    accounts = await web3.eth.getAccounts();
    seller = accounts[2]; // account[2]

  });

  /*
  // ******** MockConctract == DutchX in Interface ********
  it("Check if the Mock Contract is indeed listed as the dutchX on the gelatoDxInterface", async () => {
    assert.exists(mockExchangeContract.address);
    assert.exists(gelatoDutchXContract.address);
    let mockExchangeAddress;
    await gelatoDutchXContract
      .dutchExchange()
      .then(response => (mockExchangeAddress = response));
    assert.strictEqual(mockExchangeAddress, mockExchangeContract.address);
  });
  */
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
    assert.equal("0xAa588d3737B611baFD7bD713445b314BD453a5C8", sellToken.address, `0xAa588d3737B611baFD7bD713445b314BD453a5C8 is not equal ${sellToken.address}`)
  })

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
  it(`splitSellOrder() works`, async () => {
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
      ` ${timestamp2} should be >= to ${timestamp +
        seconds}`
    );
  });

  it("Test if first execution claim is executable based on its execution Time", async () => {

    let blockNumber = await web3.eth.getBlockNumber();
    let block = await web3.eth.getBlock(blockNumber);
    let now = block.timestamp;

    let claimsExecutionTime = await gelatoCore.getClaimExecutionTime(executionClaimIds[0])
    // Check if execution claim is executable
    // assert.equal(executionTime + 15, claimsExecutionTime.toString(), `${claimsExecutionTime} should be equal to the execution time we set + 15 seconds`)

    let claimsExecutionTimeBN = new BN(claimsExecutionTime.toString())
    let nowBN = new BN(now)
    let claimIsExecutable = nowBN.gte(claimsExecutionTimeBN)
    // Check if execution claim is executable
    assert.isTrue(claimIsExecutable, `${now} should be greater than ${claimsExecutionTime.toString()}`)
  })

  it("Successfully execute the first claim", async function() {

    let firstClaim = executionClaimIds[0]
    // Execute first claim

    let gelatoDxBalanceBefore = await sellToken.balanceOf(gelatoDutchXContract.address);
    let dutchExchangeBalanceBefore = await sellToken.balanceOf(dutchExchangeProxy.address);

    let gelatoDxBalanceBeforeBN = new BN(gelatoDxBalanceBefore.toString())
    let dutchExchangeBalanceBeforeBN = new BN(dutchExchangeBalanceBefore.toString())

    function execute() {
      return new Promise(async (resolve, reject) => {
        await gelatoCore.contract.methods
          .execute(firstClaim)
          .send({ from: gelatoCoreOwner, gas: 1000000 }, (error, hash) => {
            if (error) {
              reject(error);
            }
            resolve(hash);
          }); // gas needed to prevent out of gas error
      });
    }
    // call execute() and get hash from callback
    let executeTxHash = await execute();
    console.log(`\tExecute TxHash: ${executeTxHash}\n`);

    // Fetch Order State to check lastAuction Index
    let orderState = await gelatoDutchXContract.contract.methods.orderStates(interfaceOrderId).call()

    // console.log(orderState)

    console.log(`Claim successfully executed

    `)

    let gelatoDxBalanceAfter = await sellToken.balanceOf(gelatoDutchXContract.address);
    let dutchExchangeBalanceAfter = await sellToken.balanceOf(dutchExchangeProxy.address);

    let gelatoDxBalanceAfterBN = new BN(gelatoDxBalanceAfter.toString())
    let dutchExchangeBalanceAfterBN = new BN(dutchExchangeBalanceAfter.toString())

    let dutchExchangeGotFunds = dutchExchangeBalanceAfterBN.eq(dutchExchangeBalanceBeforeBN.add(SUBORDER_SIZE_BN))
    let gelatoDXGotFunds = gelatoDxBalanceAfterBN.eq(gelatoDxBalanceBeforeBN.sub(SUBORDER_SIZE_BN))

    assert.isTrue(dutchExchangeGotFunds, `DutchX was ${dutchExchangeBalanceBeforeBN.toString()}, received ${SUBORDER_SIZE_BN.toString()}, but is now ${dutchExchangeBalanceAfterBN.toString()}`)

    assert.isTrue(gelatoDXGotFunds, `gelatoDX Interface should be less ${SUBORDER_SIZE_BN.toString()}`)

    console.log("First Tets pass")

    // get executeTxReceipt with executeTx hash
    let txReceipt = await web3.eth.getTransactionReceipt(executeTxHash, (error, result) => {
      if (error) {
        console.error;
      }
    });

    let blockNumber = txReceipt.blockNumber;
    // this.timeout(5000);

    // console.log(`Before gelatoDX Balance: ${gelatoDxBalance1.toString()}`)
    // console.log(`Before gelatoDX Balance: ${dutchExchangeBalance1.toString()}`)

    // console.log(`After gelatoDX Balance: ${gelatoDxBalance.toString()}`)
    // console.log(`After gelatoDX Balance: ${dutchExchangeBalance.toString()}`)

    let _event;
    await gelatoCore.getPastEvents(
      "LogClaimExecutedBurnedAndDeleted",
      (error, events) => {
        if (error) {
          console.error("errored during gelatoCore.getPastEvent()");
        } else {
          // Event data checks
          assert.strictEqual(events.event, "LogClaimExecutedBurnedAndDeleted");
          assert.strictEqual(
            events.blockNumber,
            blockNumber,
            "LogClaimExecutedBurnedAndDeleted blocknumber problem"
          );
          assert.strictEqual(
            events.returnValues.dappInterface,
            gelatoDutchXContract.address,
            "LogClaimExecutedBurnedAndDeleted dappInterface problem"
          );
          assert.strictEqual(
            events.returnValues.executor,
            gelatoCoreOwner,
            "LogClaimExecutedBurnedAndDeleted executor problem"
          );
          assert.strictEqual(
            events.returnValues.executionClaimOwner,
            seller,
            "LogClaimExecutedBurnedAndDeleted executionClaimOwner problem"
          );
          assert.strictEqual(
            events.returnValues.gelatoCorePayable,
            GDX_PREPAID_FEE_BN.toString(),
            "LogClaimExecutedBurnedAndDeleted gelatoCorePayable problem"
          );

          // Log the event return values
          console.log(
            "\n\tLogClaimExecutedBurnedAndDeleted Event Return Values:\n\t",
            events.returnValues,
            "\n"
          );
          // Hold on to event for next assert.ok
          _event = events;
        }
      }
    );
    // Make sure event were emitted
    assert.exists(_event, "LogClaimExecutedBurnedAndDeleted _event do not exist");
    // #########

  });
});
