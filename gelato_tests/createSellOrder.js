/* Gelato createSellOrder script
    @dev: Terminal command to run this script:
    Terminal window 1: watch this for stdout from Gelato.sol
    * yarn rpc
    Terminal window 2: watch this for stdout from createSellOrder.js file.
    * yarn setup
    * truffle exec ./createSellOrder.js
*/
// Requires
const GelatoCore = artifacts.require('GelatoCore');
const GelatoDutchX = artifacts.require('GelatoDutchX');
const SellToken = artifacts.require('EtherToken')
const BuyToken = artifacts.require('TokenRDN')

// @params constants: createSellOrder()
const BUY_TOKEN = BuyToken.address // RDN
const SELL_TOKEN = SellToken.address // RDN
const SUBORDER_SIZE = 10;
const NUM_SUBORDERS = 2;
const TOTAL_SELL_VOLUME = SUBORDER_SIZE * NUM_SUBORDERS;
const TOTAL_SELL_VOLUME_UNIT = "ether";
const SUBORDER_UNIT = "ether";
const FREEZE_TIME = 21600; // 6h
const EXECUTOR_REWARD_PER_SUBORDER = "10";
const EXECUTOR_REWARD_PER_SUBORDER_UNIT = "finney";

module.exports = () => {

  async function testSellOrder() {

    const gelatoDX = await GelatoDutchX.at(GelatoDutchX.address)
    const gelatoCore = await GelatoCore.at(GelatoCore.address)
    const sellTokenContract = await SellToken.at(SELL_TOKEN)
    const accounts = await web3.eth.getAccounts()
    const seller = accounts[9]

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

    const executorRewardPerSubOrder = web3.utils.toWei(
      EXECUTOR_REWARD_PER_SUBORDER,
      EXECUTOR_REWARD_PER_SUBORDER_UNIT
    );

    let executorRewardTotal = SUBORDER_SIZE * NUM_SUBORDERS; // 10 finney

    executorRewardTotal = web3.utils.toWei(
      executorRewardTotal.toString(),
      "finney"
    );

    console.log(`
                    Summon Gelato Sell Order
        ==================================================
        `);

    const block = await web3.eth.getBlockNumber()
    const blockDetails = await web3.eth.getBlock(block)
    const timestamp = blockDetails.timestamp
    const hammerTime = timestamp
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
        freezeTime:                ${FREEZE_TIME}
        executorRewardPerSubOrder: ${executorRewardPerSubOrder}
        ==================================================
    `);

    // Gelato contract call to createSellOrder
    const txSellOrder = await gelatoDX.splitSellOrder(
      SELL_TOKEN,
      BUY_TOKEN,
      totalSellVolume,
      NUM_SUBORDERS,
      subOrderSize,
      hammerTime,
      FREEZE_TIME,
      { from: seller, value: executorRewardTotal }
    );

    const event = await gelatoDX.getPastEvents('LogNewSellOrderCreated')

    const event2 = await gelatoCore.getPastEvents('LogNewClaimCreated')


    const claims = [];
    const tokenIds = [];
    const sellOrderHash = event[0].returnValues.sellOrderHash

    console.log(`SellOrderHash: ${sellOrderHash}`)
    console.log("###########")

    for (const event of event2) {
      let tokenId = event.returnValues.tokenId
      console.log("###########")
      console.log(`TokenID: ${tokenId}`)
      const claim = await gelatoCore.getClaim(tokenId)
      console.log(`Owner: ${claim.trader}`)
      claims.push(claim)
      tokenIds.push(tokenId)
    }

    // Claim used for testing purposes
    const tokenId = tokenIds[0]

    // Change ownership
    console.log(`######## Swapping ownership from ${seller} to ${accounts[4]} #######`)

    const oldOwner = await gelatoCore.ownerOf(tokenId)
    console.log(`Previous Owner of Token ${tokenId}: ${oldOwner}`)

    const approval = await gelatoCore.approve(accounts[4], tokenId, { from: seller })

    const ownershipSwapReceipe = await gelatoCore.safeTransferFrom(seller, accounts[4], tokenId, { from: seller })

    const newOwner = await gelatoCore.ownerOf(tokenId)
    console.log(`New Owner of Token ${tokenId}: ${newOwner}`)

    console.log(`######## Swapping ownership successful #######`)

    console.log(`######## Testing the BURN FUNCION #######`)

    console.log(`Initiating burning of Token ${tokenId}`)

    const burnReceipt = await gelatoCore.burnClaim(tokenId)


    console.log(`Burn completed`)

    console.log(`Fetching new owner ...`)

    const transfers = await gelatoCore.getPastEvents('Transfer')

    const nullAddress = transfers[0].returnValues.to

    console.log(`Token was burned: ${nullAddress === '0x0000000000000000000000000000000000000000'}`)

    /*


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
        hammerTime ready:          ${parseInt(sellOrder.hammerTime) <= timestamp}
        numSubOrders == tSV/sOS:   ${sellOrder.totalSellVolume / sellOrder.subOrderSize == sellOrder.numSubOrders}
        executorRewardPerSubOrder
        is 10 finney:              ${sellOrder.executorRewardPerSubOrder == web3.utils.toWei("10", "finney")}
        ==================================================
        `);

    // User external TX 2 and TX2 checks
    const txApproval = await sellTokenContract.approve(Gelato.address, totalSellVolume, {
      from: seller
    });
    const allowance = await sellTokenContract.allowance(seller, Gelato.address);

    console.log(`
                    Seller TX2-ERC20: approves Gelato contract for 20 WETH
                    ------------------------------------------------------
        Approved:                  ${txApproval.logs[0].args.value}

                    Seller TX2-ERC20 check: Gelato's allowance for seller's ERC20
                    -------------------------------------------------------------
        Allowance:                 ${allowance}
        Allowance == sellOrder.totalSellVolume: ${allowance == parseInt(sellOrder.totalSellVolume)}
        ==================================================
        `);

    // Write SELL_ORDER_HASH to tmp_file for parent process to read from



    return (`
                        Testing Complete
                        ----------------
                Sell Order Hash:                 ${sellOrderHash}
                Hammertime:                      ${new Date(parseInt(sellOrder.hammerTime)).toTimeString()}
                Hammerdate:                      ${new Date(parseInt(sellOrder.hammerTime)).toDateString()}
                Now:                             ${new Date(Date.now()).toTimeString()}
                Date:                            ${new Date(Date.now()).toDateString()}
                Remaining subOrders left:        ${sellOrder.remainingSubOrders}
                Remaining Withdrawals left:      ${sellOrder.remainingWithdrawals}
                First subOrder ready for execution: default false: due to auction1 behavior.
        =====================================================
                        !!!NEXT STEPS!!!
                        ----------------
                => See Readme.md for copy paste commands.
        Then next run:
        --------------------------------------------------
        truffle exec ./execSubOrder.js "${sellOrderHash}"
        --------------------------------------------------
                !!!! DO NOT FORGET THE " " around sellOrderHash !!!
        `);

      */
    return (`THE END`)
  }

  testSellOrder().then(result => { console.log(result) });
}