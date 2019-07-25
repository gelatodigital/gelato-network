/* Gelato createSellOrder script
    @dev: Terminal command to run this script:
    Terminal window 1: watch this for stdout from GelatoCore and GELATO_DX
    * yarn rpc
    Terminal window 2: watch this for stdout from createSellOrder.js file.
    * yarn setup
    * truffle exec ./createSellOrder.js
*/
let accounts;
const SELLER = "0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef"; // account[2]:
let seller; // account[2]
// Deployed contract instances
// Gelato
const GelatoCore = artifacts.require("GelatoCore");
let gelatoCore;

const GelatoDutchX = artifacts.require("GelatoDutchX");
let gelatoDutchX;

// DutchX
const SellToken = artifacts.require("EtherToken"); // WETH
let sellToken;

const BuyToken = artifacts.require("TokenRDN"); // RDN
let buyToken;
// ********** Truffle/web3 setup EN ********

// For testing
const assert = require("assert");

// Big Number stuff
const BN = web3.utils.BN;

// Gelato-Core specific
// Constants
// GELATO_GAS_PRICE:
//  This is a state variable that got deployed with truffle migrate
//  and was set inside 3_deploy_gelato.js. We should import this variable
//  instead of hardcoding it.
//  It should match the truffle.js specified DEFAULT_GAS_PRICE_GWEI = 5
const GELATO_GAS_PRICE_BN = new BN(web3.utils.toWei("5", "gwei"));
const GDX_MAXGAS_BN = new BN("400000"); // 400.000 must be benchmarked
const GDX_PREPAID_FEE_BN = GDX_MAXGAS_BN.mul(GELATO_GAS_PRICE_BN); // wei

// GELATO_DX specific
const TOTAL_SELL_VOLUME = web3.utils.toWei("20", "ether"); // 20 WETH
const NUM_SUBORDERS_BN = new BN("2");
const SUBORDER_SIZE_BN = new BN(web3.utils.toWei("10", "ether")); // 10 WETH
const INTERVAL_SPAN = 21600; // 6 hours
// MSG_VALUE_BN needs .add(1) in GELATO_DX due to offset of last withdrawal executionClaim
const MSG_VALUE_BN = GDX_PREPAID_FEE_BN.mul(NUM_SUBORDERS_BN.add(new BN(1))); // wei
// 3 claims minted due to 2 subOrders + lastWithdrawal (3 subOrders)
const NUM_EXECUTIONCLAIMS = 3;

// State shared across the unit tests
// tx returned data
let txHash;
let txReceipt;
let blockNumber;
// block data
let block; // e.g. getBlock(blockNumber).timstamp
let timestamp;

// To be set variables
// Prior to GELATO_DX.splitSellOrder():
let executionTime; // timestamp

// Post GELATO_DX.splitSellOrder():
let orderId;
let orderState;
let executionClaimIds = [];
let executionTimes = [];

// Module exports for the GelatoCore.execute() test
module.exports.executionClaimIds = executionClaimIds;
module.exports.interfaceOrderId = orderId;
module.exports.executionTimes = executionTimes;

// Prior to GelatoCore.execute():

// Post GelatoCore.execute():

module.exports = () => {
  async function testSplitSellOrder() {
    // ********* get deployed instances ********
    // accounts
    accounts = await web3.eth.getAccounts();
    seller = accounts[2];
    assert.strictEqual(seller, SELLER, "Seller account problem");

    // get Gelato instances
    gelatoCore = await GelatoCore.deployed();
    gelatoDutchX = await GelatoDutchX.deployed();

    // get DutchX instances
    sellToken = await SellToken.deployed();
    buyToken = await BuyToken.deployed();

    // Gelato
    assert.strictEqual(
      gelatoCore.address,
      GelatoCore.address,
      "gelatoCore address problem"
    );
    assert.strictEqual(
      gelatoDutchX.address,
      GelatoDutchX.address,
      "gelatoDutchX address problem"
    );

    // DutchX
    assert.strictEqual(
      sellToken.address,
      SellToken.address,
      "sellToken address problem"
    );
    assert.strictEqual(
      buyToken.address,
      BuyToken.address,
      "buyToken address problem"
    );
    // ********* get deployed instances END ********

    // ********************* SPLITSELLORDER -> MINT_CLAIMS *********************

    // ******** Seller ERC20 approves the GELATO_DX for TotalSellVolume ********
    // Seller external TX1:
    await sellToken.contract.methods
      .approve(gelatoDutchX.address, TOTAL_SELL_VOLUME)
      .send({ from: seller });

    const allowance = await sellToken.contract.methods
      .allowance(seller, gelatoDutchX.address)
      .call();

    assert.strictEqual(
      allowance,
      TOTAL_SELL_VOLUME,
      `The ERC20 ${
        sellToken.address
      } allowance for the GelatoDXSplitsellAndWithdraw should be at ${TOTAL_SELL_VOLUME}`
    );
    // ******** Seller ERC20 approves the GELATO_DX for TotalSellVolume END ********

    // ******** GELATO_DX.splitSellOrder() gasUsed estimates ********
    // First set the executiontime
    blockNumber = await web3.eth.getBlockNumber();
    block = await web3.eth.getBlock(blockNumber);
    timestamp = block.timestamp;
    executionTime = timestamp + 15; // must be >= now (latency)

    // Get and log estimated gasUsed by splitSellOrder fn
    gelatoDutchX.contract.methods
      .splitSellOrder(
        sellToken.address,
        buyToken.address,
        TOTAL_SELL_VOLUME,
        NUM_SUBORDERS_BN.toString(),
        SUBORDER_SIZE_BN.toString(),
        executionTime,
        INTERVAL_SPAN
      )
      .estimateGas(
        { from: SELLER, value: MSG_VALUE_BN, gas: 1000000 }, // gas needed to prevent out of gas error
        async (error, estimatedGasUsed) => {
          if (error) {
            console.error("errored trying to estimate the gas");
          } else {
            // Get and log gasLimit
            await web3.eth.getBlock("latest", false, (error, _block) => {
              if (error) {
                console.error("errored trying to get the block");
              } else {
                block = _block;
              }
            });
            console.log(`\t\tgasLimit:           ${parseInt(block.gasLimit)}`);
            console.log(`\t\testimated gasUsed:   ${estimatedGasUsed}`);
          }
        }
      );
    // ******** GELATO_DX.splitSellOrder() gasUsed estimates END ********

    // ******** seller calls GELATO_DX.splitSellOrder() ********
    // First get gelatoCore's balance pre executionClaim minting
    let gelatoCoreBalancePre = new BN(
      await web3.eth.getBalance(gelatoCore.address)
    );
    // Second set the executiontime
    blockNumber = await web3.eth.getBlockNumber();
    block = await web3.eth.getBlock(blockNumber);
    timestamp = block.timestamp;
    executionTime = timestamp + 15; // to account for latency

    // Seller external TX2:
    // benchmarked gasUsed = 726,360 (for 2 subOrders + 1 lastWithdrawal)
    await gelatoDutchX.contract.methods
      .splitSellOrder(
        sellToken.address,
        buyToken.address,
        TOTAL_SELL_VOLUME,
        NUM_SUBORDERS_BN.toString(),
        SUBORDER_SIZE_BN.toString(),
        executionTime,
        INTERVAL_SPAN
      )
      .send({ from: SELLER, value: MSG_VALUE_BN, gas: 1000000 }) // gas needed to prevent out of gas error
      .once("transactionHash", hash => (txHash = hash))
      .once("receipt", receipt => (txReceipt = receipt))
      .on("error", console.error);

    // Check that gelatoCore has received msg.value funds in its balance
    let gelatoCoreBalancePost = new BN(
      await web3.eth.getBalance(gelatoCore.address)
    );
    assert.strictEqual(
      gelatoCoreBalancePost.toString(),
      gelatoCoreBalancePre.add(MSG_VALUE_BN).toString(),
      "gelatoCore ether balance problem"
    );

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
    orderId = txReceipt.events.LogNewOrderCreated.returnValues.orderId;

    assert.strictEqual(
      txReceipt.events.LogNewOrderCreated.returnValues.orderId,
      orderId,
      "LogNewOrderCreated orderId problem"
    );

    // Log the event
    console.log(
      "\n\tLogNewOrderCreated Event Return Values:\n\t",
      txReceipt.events.LogNewOrderCreated.returnValues,
      "\n"
    );

    // fetch the newly created orderState on GELATO_DX
    orderState = await gelatoDutchX.contract.methods
      .orderStates(orderId)
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
    assert.strictEqual(
      orderState.remainingSubOrders,
      NUM_SUBORDERS_BN.toString(),
      "orderState.remainingSubOrders problem"
    );
    assert.strictEqual(orderState.lastSellAmountAfterFee, "0");
    assert.strictEqual(
      orderState.remainingWithdrawals,
      NUM_SUBORDERS_BN.toString(),
      "orderState.remainingWithdrawals problem"
    );

    // Log actual gasUsed
    console.log("\t\tactual gasUsed:     ", txReceipt.gasUsed);

    // Save transactions blockNumber for next event emission test
    blockNumber = txReceipt.blockNumber;
    // ******** seller calls GELATO_DX.splitSellOrder() and mint its execution claims on Core END********

    // Log TX 1 order state checks
    console.log(
      `
                    Seller TX1-splitSellOrder on-chain orderState check
                    ---------------------------------------------------
        orderId:                   ${orderId}
        lastAuctionWasWaiting:     ${orderState.lastAuctionWasWaiting}
        lastAuctionIndex:          ${orderState.lastAuctionIndex}
        remainingSubOrders:        ${orderState.remainingSubOrders}
        lastSellAmountAfterFee:    ${orderState.lastSellAmountAfterFee}
        remainingWithdrawals:      ${orderState.remainingWithdrawals}
                    ==================================================
      `
    ); // @dev: cannot get filter to work (not needed tho)
    // ******** seller calls GELATO_DX.splitSellOrder() and mint its execution claims on Core END********

    // ******** Event LogNewExecutionClaimMinted on gelatoCore ********
    // Filter events emitted from gelatoCore
    /*let filter = {
      dappInterface: gelatoDutchX.address,
      interfaceOrderId: orderId,
      executionClaimOwner: SELLER
    };*/
    let _events;
    await gelatoCore.getPastEvents(
      "LogNewExecutionClaimMinted",
      // { filter, fromBlock: parseInt(blockNumber) },  // exercise: make this work
      (error, events) => {
        if (error) {
          console.error("errored during gelatoCore.getPastEvents()");
        } else {
          // correct number of LogNewExecutionClaimMinted events were emitted
          assert.strictEqual(events.length, parseInt(NUM_SUBORDERS_BN) + 1); // +1=lastWithdrawal

          // Further event data checks and fetching of executionClaimIds
          for (event of events) {
            assert.strictEqual(event.event, "LogNewExecutionClaimMinted");
            assert.strictEqual(
              event.blockNumber,
              blockNumber,
              "LogExecutionClaimMinted blocknumber problem"
            );
            assert.strictEqual(
              event.returnValues.dappInterface,
              gelatoDutchX.address,
              "LogExecutionClaimMinted dappInterface problem"
            );
            assert.strictEqual(
              event.returnValues.interfaceOrderId,
              orderId,
              "LogExecutionClaimMinted interfaceOrderId problem"
            );
            assert.strictEqual(
              event.returnValues.executionClaimOwner,
              seller,
              "LogExecutionClaimMinted executionClaimOwner problem"
            );
            assert.strictEqual(
              event.returnValues.gelatoCoreReceivable,
              GDX_PREPAID_FEE_BN.toString(),
              "LogExecutionClaimMinted gelatoCoreReceibable problem"
            );

            // Save the executionClaimIds
            executionClaimIds.push(event.returnValues.executionClaimId);

            // Log the events return values
            console.log(
              "\n\tLogNewExecutionClaimMinted Event Return Values:\n\t",
              event.returnValues,
              "\n"
            );
          }
          // Hold on to events for next assert.ok
          _events = events;
        }
      }
    );
    // Make sure events were emitted
    assert.ok(_events, "LogNewExecutionClaimMinted _events do not exist");

    // Make sure 3 events were emitted and 3 claims minted (2 subOrders + lastWithdrawal)
    assert.strictEqual(
      executionClaimIds.length,
      NUM_EXECUTIONCLAIMS,
      "Problem with number of LogNewExecutionClaimMinted events"
    );
    // ******** Event LogNewExecutionClaimMinted on gelatoCore END ********

    // ******** Minted execution claims on Core ********
    let incrementedExecutionTimes = executionTime;
    // fetch each executionClaim from core and test it
    for (executionClaimId of executionClaimIds) {
      let {
        executionClaimOwner,
        dappInterface,
        interfaceOrderId,
        sellToken: _sellToken,
        buyToken: _buyToken,
        sellAmount,
        executionTime: _executionTime,
        prepaidExecutionFee
      } = await gelatoCore.contract.methods
        .getExecutionClaim(executionClaimId)
        .call();
      assert.strictEqual(
        executionClaimOwner,
        seller,
        "executionClaimOwner problem"
      );
      assert.strictEqual(
        dappInterface,
        gelatoDutchX.address,
        "dappInterface problem"
      );
      assert.strictEqual(interfaceOrderId, orderId, "interfaceOrderId problem");
      assert.strictEqual(_sellToken, sellToken.address, "sellToken problem");
      assert.strictEqual(_buyToken, buyToken.address, "buyToken problem");
      assert.strictEqual(
        sellAmount,
        SUBORDER_SIZE_BN.toString(),
        "sellAmount problem"
      );
      assert.strictEqual(
        _executionTime,
        incrementedExecutionTimes.toString(),
        "executionTime problem"
      );
      assert.strictEqual(
        prepaidExecutionFee,
        GDX_PREPAID_FEE_BN.toString(),
        "prepaidExecutionFee problem"
      );
      // Save the executionTimes
      executionTimes.push(_executionTime);

      incrementedExecutionTimes += INTERVAL_SPAN;
    }

    // Make sure there are the right amount of execution times
    assert.strictEqual(
      executionTimes.length,
      NUM_EXECUTIONCLAIMS,
      "problem with number of executionTimes"
    );
    // ******** Minted execution claims on Core END ********

    let [executionTime1, executionTime2, executionTime3] = executionTimes;
    return `\n
        SplitSellOrder() Complete
        -------------------------
        gelatoCoreAddress:                  ${gelatoCore.address}
        dappInterfaceAddress(gelatoDutchX): ${gelatoDutchX.address}
        interfaceOrderId:                   ${orderId}
        executionClaimIds:                  ${executionClaimIds.toString()}

        executionTimes:                     ${executionTime1}
        intervalSpan:                           +${INTERVAL_SPAN}
                                            ${executionTime2}
        intervalSpan:                           +${INTERVAL_SPAN}
                                            ${executionTime3}

                                            Below are Ganache fetched times: inaccurate
                                            ${new Date(
                                              parseInt(executionTime1)
                                            ).toTimeString()}
                                            ${new Date(
                                              parseInt(executionTime1)
                                            ).toDateString()}
                                            ${new Date(
                                              parseInt(executionTime2)
                                            ).toTimeString()}
                                            ${new Date(
                                              parseInt(executionTime2)
                                            ).toDateString()}
                                            ${new Date(
                                              parseInt(executionTime3)
                                            ).toTimeString()}
                                            ${new Date(
                                              parseInt(executionTime3)
                                            ).toDateString()}\n

      `;

    // ********************* SPLITSELLORDER -> MINT_CLAIMS END *********************
  }

  // run the test
  testSplitSellOrder().then(result => console.log(result));
};
