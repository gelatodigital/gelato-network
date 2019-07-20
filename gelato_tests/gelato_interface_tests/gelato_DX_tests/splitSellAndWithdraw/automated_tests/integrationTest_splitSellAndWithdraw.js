/** Automated integration test for GelatoDxSplitSellAndWithdraw
 * default test suite
 *
 * GelatoDXSplitSellAndWithdraw.splitSellOrder() covers:
 * -----------------------------------------------------
 * -> GelatoCore.mintClaim()
 *
 *
 * -----------------------------------------------------
 *
 * GelatoCore.execute() covers:
 * -----------------------------------------------------------------
 * IcedOut(GelatoDXSplitSellAndWithdraw).execute()
 * -> GelatoDXSplitSellAndWithdraw.execute() test coverage:
 * automated withdrawals (on interface)
 * -> executore payout (on core)
 * -----------------------------------------------------------------
 *  */
// Big Number stuff
const BN = web3.utils.BN;

// Gelato-Core specific
const GelatoCore = artifacts.require("GelatoCore");
// Constants
// GELATO_GAS_PRICE:
//  This is a state variable that got deployed with truffle migrate
//  and was set inside 3_deploy_gelato.js. We should import this variable
//  instead of hardcoding it.
//  It should match the truffle.js specified DEFAULT_GAS_PRICE_GWEI = 5
const GELATO_GAS_PRICE_BN = new BN(web3.utils.toWei("5", "gwei"));
// Gelato-Core specific END

// GDXSSAW specific
// Artifacts
const GelatoDXSplitSellAndWithdraw = artifacts.require(
  "GelatoDXSplitSellAndWithdraw"
);
const SellToken = artifacts.require("EtherToken");
const BuyToken = artifacts.require("TokenRDN");
// Constants
const SELLER = "0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef"; // account[2]:
const SELL_TOKEN = "0xAa588d3737B611baFD7bD713445b314BD453a5C8"; // WETH
const BUY_TOKEN = "0x8ACEe021a27779d8E98B9650722676B850b25E11"; // RDN
const TOTAL_SELL_VOLUME = 20; // 20 WETH
const TOTAL_SELL_VOLUME_UNIT = "ether";
const NUM_SUBORDERS = 2;
const SUBORDER_SIZE = 10; // 10 WETH
const SUBORDER_UNIT = "ether";
const INTERVAL_SPAN = 21600; // 6 hours
const GDXSSAW_MAXGAS = 400000;
// Big Number constants
const GDXSSAW_MAXGAS_BN = new BN(GDXSSAW_MAXGAS.toString()); // 400.000 must be benchmarked
const GELATO_PREPAID_FEE_BN = GDXSSAW_MAXGAS_BN.mul(GELATO_GAS_PRICE_BN); // wei
const NUM_SUBORDERS_BN = new BN(NUM_SUBORDERS.toString());
// MSG_VALUE needs .add(1) in GDXSSAW due to offset of last withdrawal executionClaim
const MSG_VALUE = GELATO_PREPAID_FEE_BN.mul(
  NUM_SUBORDERS_BN.add(new BN(1))
).toString(); // wei
// GDXSSAW specific END

// To be set variables
// Prior to GDXSSAW.splitSellOrder() tx
let sellTokenContract;
let buyTokenContract;
let accounts;
let totalSellVolume;
let subOrderSize;
let executionTime; // timestamp
// Post GDXSSAW.splitSellOrder() tx
let orderId;
let orderState;
let executionClaimIds = [];

// Prior to GelatoCore.execute() tx

// Post GelatoCore.execute() tx

// State shared across the unit tests
// Deployed contract instances
let gelatoCore;
let gelatoDXSplitSellAndWithdraw;
// Deployed instances owners
let gelatoCoreOwner;
let gelatoDXSplitSellAndWithdrawOwner;
// Account used for non-ownership prevention tests
let notOwner; // account[1]
// tx returned data
let txHash;
let txReceipt;
let blockNumber;
let from;
let to;
let gasUsed;
// block data
let block; // e.g. getBlock(blockNumber).timstamp
let timestamp;

// Default test suite
contract(
  "default test suite: correct deployed instances and owners",
  async accounts => {
    // suite root-level pre-hook: set the test suite variables to be shared among all tests
    before(async () => {
      gelatoCore = await GelatoCore.deployed();
      gelatoDXSplitSellAndWithdraw = await GelatoDXSplitSellAndWithdraw.deployed();
    });

    // ******** Default deployed instances tests ********
    it("retrieves deployed GelatoCore and GelatoDXSplitSellAndWithdraw instances", async () => {
      assert.exists(gelatoCore.address);
      assert.exists(gelatoDXSplitSellAndWithdraw.address);
      assert.equal(gelatoCore.address, GelatoCore.address);
      assert.equal(
        gelatoDXSplitSellAndWithdraw.address,
        GelatoDXSplitSellAndWithdraw.address
      );
    });
    // ******** Default deployed instances tests END ********

    // ******** Default ownership tests ********
    it("has accounts[0] as owners of Core and Interface and accounts[1] is not owner", async () => {
      gelatoCoreOwner = await gelatoCore.contract.methods.owner().call();
      gelatoDXSplitSellAndWithdrawOwner = await gelatoDXSplitSellAndWithdraw.contract.methods
        .owner()
        .call();

      assert.equal(gelatoCoreOwner, accounts[0]);
      assert.equal(gelatoDXSplitSellAndWithdrawOwner, accounts[0]);

      assert.notEqual(
        gelatoCoreOwner,
        accounts[1],
        "accounts[1] was expected not to be gelatoCoreOwner"
      );
      assert.notEqual(
        gelatoDXSplitSellAndWithdrawOwner,
        accounts[1],
        "accounts[1] was not expected to be gelatoDXSplitSellAndWithdrawOwner"
      );

      notOwner = accounts[1];
    });
    // ******** Default ownership tests END ********
  }
);

// Test suite to end-to-end test the creation of a GDXSSAW style claims
describe("Listing GDXSSAW -> GDXSSAW.splitSellOrder() -> GelatoCore.mintClaim()", () => {
  // suite root-level pre-hook: set the test suite variables to be shared among all tests
  before(async () => {
    sellTokenContract = await SellToken.at(SELL_TOKEN);
    buyTokenContract = await BuyToken.at(BUY_TOKEN);

    accounts = await web3.eth.getAccounts();

    totalSellVolume = web3.utils.toWei(
      TOTAL_SELL_VOLUME.toString(),
      TOTAL_SELL_VOLUME_UNIT
    );
    subOrderSize = web3.utils.toWei(SUBORDER_SIZE.toString(), SUBORDER_UNIT);
  });

  // ******** GDXSSAW default deployed instances checks ********
  it(`fetches the correct deployed sellToken and buyToken contracts`, async () => {
    assert.exists(sellTokenContract.address);
    assert.exists(buyTokenContract.address);
    assert.equal(sellTokenContract.address, SELL_TOKEN);
    assert.equal(buyTokenContract.address, BUY_TOKEN);
  });
  // ******** GDXSSAW default deployed instances checks END ********

  // ******** GDXSSAW default SELLER account checks ********
  it(`has accounts[2] set as the SELLER`, async () => {
    assert.equal(SELLER, accounts[2]);
  });
  // ******** GDXSSAW default SELLER account checks END ********

  // ******** list GDXSSAW interface on Gelato Core and set its maxGas ********
  it(`lets Core-owner list gelatoDXSplitSellAndWithdraw on GelatoCore with its maxGas set`, async () => {
    await gelatoCore.contract.methods
      .listInterface(gelatoDXSplitSellAndWithdraw.address, GDXSSAW_MAXGAS)
      .send({ from: gelatoCoreOwner })
      .then(receipt => (txReceipt = receipt));

    const isWhitelisted = await gelatoCore.contract.methods
      .getInterfaceWhitelist(gelatoDXSplitSellAndWithdraw.address)
      .call();
    const maxGas = await gelatoCore.contract.methods
      .getInterfaceMaxGas(gelatoDXSplitSellAndWithdraw.address)
      .call(); // uint256

    assert.isTrue(isWhitelisted);
    assert.equal(GDXSSAW_MAXGAS, maxGas);
  });
  // ******** list GDXSSAW interface on Gelato Core and set its maxGas END ********
  // ******** Event on core LogNewInterfaceListed ********
  it(`emits correct LogNewInterfaceLised(dappInterface, maxGas) on gelatoCore`, async () => {
    assert.exists(txReceipt.events.LogNewInterfaceListed);
    assert.equal(
      txReceipt.events.LogNewInterfaceListed.returnValues.dappInterface,
      gelatoDXSplitSellAndWithdraw.address
    );
    assert.equal(
      txReceipt.events.LogNewInterfaceListed.returnValues.maxGas,
      GDXSSAW_MAXGAS
    );
  });
  // ******** Event on core LogNewInterfaceListed END ********

  // ******** Seller ERC20 approves the GDXSSAW for TotalSellVolume ********
  it(`seller approves GelatoDXSplitsellAndWithdraw for the totalSellVolume`, async () => {
    await sellTokenContract.contract.methods
      .approve(gelatoDXSplitSellAndWithdraw.address, totalSellVolume)
      .send({ from: SELLER });

    const allowance = await sellTokenContract.contract.methods
      .allowance(SELLER, gelatoDXSplitSellAndWithdraw.address)
      .call();

    assert.equal(
      allowance,
      totalSellVolume,
      `The ERC20 ${
        sellTokenContract.address
      } allowance for the GelatoDXSplitsellAndWithdraw should be at ${totalSellVolume}`
    );
  });
  // ******** Seller ERC20 approves the GDXSSAW for TotalSellVolume END ********

  // ******** GDXSSAW.splitSellOrder() gasUsed estimates ********
  it(`estimates GelatoDXSplitsellAndWithdraw.splitSellOrder() gasUsed and logs gasLimit`, async () => {
    // First set the executiontime
    blockNumber = await web3.eth.getBlockNumber();
    block = await web3.eth.getBlock(blockNumber);
    timestamp = block.timestamp;
    executionTime = timestamp;
    // Get and log estimated gasUsed by splitSellOrder fn
    gelatoDXSplitSellAndWithdraw.contract.methods
      .splitSellOrder(
        SELL_TOKEN,
        BUY_TOKEN,
        totalSellVolume,
        NUM_SUBORDERS,
        subOrderSize,
        executionTime,
        INTERVAL_SPAN
      )
      .estimateGas(
        { from: SELLER, value: MSG_VALUE, gas: 1000000 }, // gas needed to prevent out of gas error
        async (error, estimatedGasUsed) => {
          if (error) {
            console.error;
          } else {
            // Get and log gasLimit
            await web3.eth.getBlock("latest", false, (error, block) => {
              if (error) {
                console.error;
              } else {
                block = block;
              }
            });
            console.log(
              `Estimated gasUsed by GDXSSAW.splitSellOrder(): ${estimatedGasUsed}`
            );
            console.log(
              `gasLimit:                                      ${block.gasLimit}`
            );
          }
        }
      );
    // This test just tried to get and log the estimate
    assert(true);
  });
  // ******** GDXSSAW.splitSellOrder() gasUsed estimates END ********

  // ******** call GDXSSAW.splitSellOrder() ********
  it(`GDXSSAW.splitSellOrder() works with correct LogNewOrderCreated event`, async () => {
    // First set the executiontime
    blockNumber = await web3.eth.getBlockNumber();
    block = await web3.eth.getBlock(blockNumber);
    timestamp = block.timestamp;
    executionTime = timestamp;

    // benchmarked gasUsed = 520109
    await gelatoDXSplitSellAndWithdraw.contract.methods
      .splitSellOrder(
        SELL_TOKEN,
        BUY_TOKEN,
        totalSellVolume,
        NUM_SUBORDERS,
        subOrderSize,
        executionTime,
        INTERVAL_SPAN
      )
      .send({ from: SELLER, value: MSG_VALUE, gas: 1000000 }) // gas needed to prevent out of gas error
      .once("transactionHash", hash => (txHash = hash))
      .once("receipt", receipt => (txReceipt = receipt))
      .on("error", console.error);

    // emitted event on GDXSSAW: LogNewOrderCreated(orderId, seller)
    assert.exists(txReceipt.events.LogNewOrderCreated);

    // check if event has correct return values
    assert.equal(
      txReceipt.events.LogNewOrderCreated.returnValues.seller,
      SELLER
    );
    assert.equal(txReceipt.events.LogNewOrderCreated.returnValues.orderId, 1);

    // save the orderId
    orderId = txReceipt.events.LogNewOrderCreated.returnValues.orderId;

    // fetch the newly created orderState on GDXSSAW
    orderState = await gelatoDXSplitSellAndWithdraw.contract.methods
      .orderStates(orderId)
      .call();

    // check the orderState
    assert.isFalse(orderState.lastAuctionWasWaiting);
    assert.equal(orderState.lastAuctionIndex, 0);
    assert.equal(orderState.remainingSubOrders, NUM_SUBORDERS);
    assert.equal(orderState.lastSellAmountAfterFee, 0);
    assert.equal(orderState.remainingWithdrawals, NUM_SUBORDERS);
  });
  // ******** call GDXSSAW.splitSellOrder() and mint its execution claims on Core END********
  // ******** Events on gelatoCore ********
  it(`emits correct LogNewExecutionClaimMinted events on gelatoCore`, async () => {
    // Filter events emitted from gelatoCore
    await gelatoCore.getPastEvents(
      "LogNewExecutionClaimMinted",
      {
        filter: {
          dappInterface: gelatoDXSplitSellAndWithdraw.address,
          orderId: orderId
        },
        fromBlock: blockNumber
      },
      (error, events) => {
        if (error) {
          console.error;
        } else {
          console.log(events);

          // correct number of LogNewExecutionClaimMinted events were emitted
          assert.isEqual(events.length, NUM_SUBORDERS + 1); // +1=lastWithdrawal

          // Further event data checks and fetching of executionClaimIds
          for (event of events) {
            assert.equal(event.event, "LogNewExecutionClaimMinted");
            assert.equal(event.blockNumber, blockNumber);
            assert.equal(
              event.returnValues.dappInterface,
              gelatoDXSplitSellAndWithdraw.address
            );
            assert.equal(event.returnValues.interfaceOrderId, orderId);
            assert.equal(event.returnValues.executionClaimOwner, seller);
            assert.equal(
              event.returnValues.gelatoCoreReceivable,
              GELATO_PREPAID_FEE_BN
            );

            // Save the executionClaimIds
            executionClaimIds.push(event.returnValues.executionClaimId);
          }
        }
      }
    );
  });
  // ******** Events on gelatoCore END ********
  // ******** Minted execution claims on Core ********
  // ******** Minted execution claims on Core END ********
});
