/* Gelato createSellOrder script
    @dev: Terminal command to run this script:
    Terminal window 1: watch this for stdout from Gelato.sol
    * yarn rpc
    Terminal window 2: watch this for stdout from createSellOrder.js file.
    * yarn setup
    * truffle exec ./createSellOrder.js
*/
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
const SELL_TOKEN = "0xAa588d3737B611baFD7bD713445b314BD453a5C8"; // WETH
const BUY_TOKEN = "0x8ACEe021a27779d8E98B9650722676B850b25E11"; // RDN
const TOTAL_SELL_VOLUME = 20; // 20 WETH
const TOTAL_SELL_VOLUME_UNIT = "ether";
const NUM_SUBORDERS = 2;
const NUM_PLUS_ONE = NUM_SUBORDERS + 1
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
  NUM_SUBORDERS_BN.add(new BN(1)))
// GDXSSAW specific END



module.exports = () => {
  async function testSplitSellOrder () {
    const gelatoDX = await GelatoDXSplitSellAndWithdraw.at(
      GelatoDXSplitSellAndWithdraw.address
    );
    const gelatoCore = await GelatoCore.at(GelatoCore.address);
    const sellTokenContract = await SellToken.at(SELL_TOKEN);

    const accounts = await web3.eth.getAccounts();
    const SELLER = accounts[2]
    // Selling a total of 2 WETH
    // params of createSellOrder
    const totalSellVolume = web3.utils.toWei(
      TOTAL_SELL_VOLUME.toString(),
      TOTAL_SELL_VOLUME_UNIT
    );

    const subOrderSize = web3.utils.toWei(
      SUBORDER_SIZE.toString(),
      SUBORDER_UNIT
    );

    console.log(`
                    Summon Gelato Sell Order
        ==================================================
        `);

    const block = await web3.eth.getBlockNumber();
    const blockDetails = await web3.eth.getBlock(block);
    const timestamp = blockDetails.timestamp;
    const hammerTime = timestamp;
    console.log(`
                    Block info:
                    ----------
        Current Timestamp:      ${timestamp}
        Current Timestamp Time: ${new Date(timestamp).toTimeString()}
        Current Timestamp Date: ${new Date(timestamp).toDateString()}
        ==================================================
        `);

    // User external TX 1
    console.log(`
                    Create 1st Sell Order...
                    Parameters:
                    ----------
        sellToken:                 ${SELL_TOKEN}
        buyToken:                  ${BUY_TOKEN}
        totalSellVolume:           ${totalSellVolume}
        subOrderSize:              ${subOrderSize}
        remainingSubOrders:        ${NUM_SUBORDERS}
        remainingWithdrawals:      ${NUM_SUBORDERS}
        hammerTime:                ${new Date(hammerTime).toTimeString()}
        hammerTime Date:           ${new Date(hammerTime).toDateString()}
        freezeTime:                ${INTERVAL_SPAN}
        ==================================================
        `);



    // 1. Fetch core owner
    const gelatoCoreOwner = await gelatoCore.owner();
    console.log(`Gelato Core Owner: ${gelatoCoreOwner}`)

    const gelatoDXSplitSellAndWithdrawOwner = await gelatoDX.owner();
    console.log(`Gelato DX Interface Owner: ${gelatoDXSplitSellAndWithdrawOwner}`)

    // 2. Add new interface and set max gas - Sender == geletoCoreOwner
    // Only conduct the first time this script is executed
    try {
      await gelatoCore.contract.methods.listInterface(GelatoDXSplitSellAndWithdraw.address, GDXSSAW_MAXGAS)
        .send({ from: gelatoCoreOwner })
    } catch (err) {
    }

    // 3. Seller needs to approve GelatoDX
    const txApproval = await sellTokenContract.approve(GelatoDXSplitSellAndWithdraw.address, totalSellVolume, { from: SELLER });
    const allowance = await sellTokenContract.allowance(SELLER, GelatoDXSplitSellAndWithdraw.address);
    console.log(`Allowance: ${allowance.toString(10)}`)

    console.log(`Initiate Create Sell Order
    `)

    // Set exection time
    const executionTime = timestamp
    // Gelato contract call to createSellOrder
    console.log(`
      ${SELL_TOKEN}
      ${BUY_TOKEN}
      ${totalSellVolume}
      ${NUM_SUBORDERS}
      ${subOrderSize}
      ${executionTime}
      ${INTERVAL_SPAN}
      ${SELLER}
      ${MSG_VALUE}
    `)

    await gelatoDX.contract.methods
      .splitSellOrder(
        SELL_TOKEN,
        BUY_TOKEN,
        totalSellVolume,
        NUM_SUBORDERS,
        subOrderSize,
        executionTime,
        INTERVAL_SPAN
      )
      .send({ from: SELLER, value: MSG_VALUE, gas: 5000000 }) // gas needed to prevent out of gas error
      // .once("transactionHash", hash => (console.log(hash)))
      // .once("receipt", receipt => (console.log(receipt)))
      .on("error", console.error)

    console.log(`Creation Successful`)


    const executionClaimIds = []
    // Fetch events
    await gelatoCore.getPastEvents('LogNewExecutionClaimMinted', (error, events) => console.log(error))
      .then(events => {
        events.forEach(event => {

          executionClaimIds.push(event.returnValues['executionClaimId'])

          console.log(`#####
          `)
          console.log(event.event)
          console.log(event.returnValues)
          console.log(`#####
          `)
        })
      })

    let interfaceOrderId;
    await gelatoDX.getPastEvents('LogNewOrderCreated', (error, events) => console.log(error))
      .then(events => {
        events.forEach(event => {
          interfaceOrderId = event.returnValues['orderId']

          console.log(`#####
          `)
          console.log(event.event)
          console.log(event.returnValues)
          console.log(`#####
          `)
        })
      })

    console.log(`
      First subOrder ready for execution: default false: due to auction1 behavior.
      =====================================================
                      !!!NEXT STEPS!!!
                      ----------------
              => See Readme.md for copy paste commands.
      Then next run:`)

    executionClaimIds.forEach(id => {
      console.log(`
      --------------------------------------------------
      truffle exec ./execSubOrder.js "${id}"
      --------------------------------------------------
      `);
    })

    console.log(`
      --------------------------------------------------
      InterfaceOrderId "${interfaceOrderId}"
      --------------------------------------------------
      `);

    return `
                        CreateSellOrder Complete
                        ----------------
    `;
  }

  testSplitSellOrder().then(result => {
    console.log(result);
  });
};


/* OLD CONSOLE LOGS
Sell Order Hash:                 ${sellOrderHash}
Hammertime:                      ${new Date(
                  parseInt(sellOrder.hammerTime)
                  ).toTimeString()}
                Hammerdate:                      ${new Date(
                  parseInt(sellOrder.hammerTime)
                ).toDateString()}
                Now:                             ${new Date(
                  Date.now()
                ).toTimeString()}
                Date:                            ${new Date(
                  Date.now()
                  ).toDateString()}
                  Remaining subOrders left:        ${sellOrder.remainingSubOrders}
                  Remaining Withdrawals left:      ${
                    sellOrder.remainingWithdrawals
                  }
                  console.log(`
                                  Seller TX2-ERC20: approves Gelato contract for 20 WETH
                                  ------------------------------------------------------
                      Approved:                  ${txApproval.logs[0].args.value}
                                  Seller TX2-ERC20 check: Gelato's allowance for seller's ERC20
                                  -------------------------------------------------------------
                      Allowance:                 ${allowance}
                      Allowance == sellOrder.totalSellVolume: ${allowance ==
                        parseInt(sellOrder.totalSellVolume)}
                      ==================================================
                      `);
                      console.log(
      `
                    Seller TX1-createSellOrder on-chain struct check
                    -----------------------------------------------
        sellOrderHash: ${sellOrderHash}
        Seller:                    ${seller}
        lastAuctionWasWaiting:     ${sellOrder.lastAuctionWasWaiting.toString()}
        cancelled:                 ${sellOrder.cancelled}
        complete:                  ${sellOrder.complete}
        totalSellVolume:           ${sellOrder.totalSellVolume}
        subOrderSize:              ${sellOrder.subOrderSize}
        remainingSubOrders:        ${sellOrder.remainingSubOrders}
        remainingWithdrawals:      ${sellOrder.remainingWithdrawals}
        hammerTime:                ${sellOrder.hammerTime}
        freezeTime:                ${sellOrder.freezeTime}
        executorRewardPerSubOrder: ${sellOrder.executorRewardPerSubOrder}
                    Further sell Order struct checks:
                    ---------------------------------
        hammerTime ready:          ${parseInt(sellOrder.hammerTime) <=
          timestamp}
        numSubOrders == tSV/sOS:   ${sellOrder.totalSellVolume /
          sellOrder.subOrderSize ==
          sellOrder.remainingSubOrders}
        executorRewardPerSubOrder
        is 10 finney:              ${sellOrder.executorRewardPerSubOrder ==
          web3.utils.toWei("10", "finney")}
        ==================================================
        `
      );
                  */