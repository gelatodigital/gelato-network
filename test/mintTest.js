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
  executorEthBalance
} = require("./truffleTestConfig.js");

let txHash;
let txReceipt;
let totalPrepayment;
let decodedPayload;
let mintedClaims = [];
let decodedPayloads = {}
let definedExecutionTimeBN;

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
    executor = accounts[9];
  });

  it("Fetch Before Balance?", async function() {
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
      `The ERC20 ${sellToken.address} allowance for the GelatoDXSplitsellAndWithdraw should be at ${TOTAL_SELL_VOLUME}`
    );
  });

  it("Mint 2 execution claims ( 2 sell orders ) on GDX while checking user & interface balance", async () => {
    // let encodedFuncSig = web3.eth.abi.encodeFunctionCall('execDepositAndSell(uint256,address,address,uint256,uint256,uint256)')
    // console.log(`Encoded func Sig ${encodedFuncSig}`)

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

    // Calculate Prepayment amount
    let gelatoPrepayment = new BN(
      await gelatoDutchExchange.contract.methods.calcGelatoPrepayment().call()
    );
    totalPrepayment = new BN(gelatoPrepayment).mul(NUM_SUBORDERS_BN);

    // benchmarked gasUsed = 726,360 (for 2 subOrders + 1 lastWithdrawal)
    let txGasPrice = await web3.utils.toWei("5", "gwei");
    let txMintReciept = await gelatoDutchExchange.contract.methods
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
        value: totalPrepayment,
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
      .sub(totalPrepayment)
      .sub(sellerTxCostBN)
      .eq(sellerBalancePost);

    let sellerERCBalancePost = await sellToken.contract.methods
      .balanceOf(seller)
      .call();

    // Check GDX ETH balance pre post
    assert.strictEqual(
      gelatoCoreBalancePost.toString(),
      gelatoCoreBalancePre.add(totalPrepayment).toString(),
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
    let firstExecutionClaimId = lastExecutionClaimId - numberOfSubOrders;
    await gelatoCore.getPastEvents(
      "LogNewExecutionClaimMinted",
      (error, events) => {
        if (error) {
          console.error;
        }
        events.forEach(async event => {
          mintedClaims.push(event.returnValues.executionClaimId);
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
          let returnedEventPayload = event.returnValues.payload;

          // if (parseInt(event.returnValues.executionClaimId) % 2 !== 0) {
          assert.strictEqual(
            returnedEventPayload,
            encodedFuncSig,
            "LogExecutionClaimMinted functionSignature problem"
          );
        });
        // } else {
        //   assert.strictEqual(
        //     returnedFuncSig,
        //     await web3.eth.abi.encodeFunctionCall(
        //       {
        //         name: "execWithdraw",
        //         type: "function",
        //         inputs: [
        //           {
        //             type: "uint256",
        //             name: "_executionClaimId"
        //           }
        //         ]
        //       },
        //       returnedFuncSig
        //     ),
        //     "LogExecutionClaimMinted functionSignature problem"
        //   );
        // }
      }
    );


  });

  it("Check that params got encoded correctly", async () => {
    mintedClaims.forEach(async claim => {
      // FETCH execution claim params
      let encodedPayload = await gelatoCore.contract.methods
        .getClaimPayload(claim)
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

      console.log(`Returned Payload Size: ${returnedPayloadSize}`);
      console.log(`Returned Payload Size: ${returnedPayloadSize.length}`);
      console.log("---");
      console.log(`Returned Func Selec: ${returnedFuncSelec}`);
      console.log(`Returned Func Selec: ${returnedFuncSelec.length}`);
      console.log("---");
      console.log(`Returned Data Payload: ${returnedDataPayload}`);
      console.log(
        `Returned Data Payload Length: ${returnedDataPayload.length}`
      );
      console.log("---");
      console.log(`Returned whole encoded payload: ${encodedPayload}`);
      console.log(
        `Returned whole encoded payload length: ${encodedPayload.length}`
      );
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
          }
        ],
        returnedDataPayload
      );

      console.log("Decoded Payload: decodedPayload ", decodedPayload);
      decodedPayloads[claim] = decodedPayload
    });
  });
});

describe("Should not be able to mint when tokens not traded on the dutchX", () => {
  it("Check that timeSellOrders() reverts when a non existing token is chosen", async function() {
    let ERC20 = artifacts.require("ERC20");
    // Deploy 1 new ERC20
    let newBuyToken = await ERC20.new();

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
        { from: seller, value: totalPrepayment, gas: 2000000 }
      ),
      "The selected tokens are not traded on the Dutch Exchange"
    );
    assert.isTrue(true);
  });
});

describe("Check gelatoDutchExchange Interface payload values", () => {
  it("Check payload values", async () => {
    definedExecutionTimeBN = new BN(executionTime)

    mintedClaims.forEach(async claimId => {
      let selectedPayload = decodedPayloads[claimId]
      let payloadExecutionClaimId = selectedPayload._executionClaimId;
      let payloadSellToken = selectedPayload._sellToken;
      let payloadBuyToken = selectedPayload._buyToken;
      let payloadAmount = selectedPayload._amount;
      let payloadExecutionTime = selectedPayload._executionTime;
      let payloadPrepaymentPerSellOrder = selectedPayload._prepaymentPerSellOrder;

      console.log(`
        Execution Claim ID: ${payloadExecutionClaimId}
        payloadSellToken: ${payloadSellToken}
        payloadBuyToken: ${payloadBuyToken}
        payloadAmount: ${payloadAmount}
        payloadExecutionTime: ${payloadExecutionTime}
        payloadPrepaymentPerSellOrder: ${payloadPrepaymentPerSellOrder}

      `)

      orderState = await gelatoDutchExchange.contract.methods
        .orderStates(claimId)
        .call();
      // fetch the newly created orderState on GELATO_DX
      console.log(`Claim Id: ${claimId}`)
      let payloadPrepaymentPerSellOrderBN = new BN(payloadPrepaymentPerSellOrder)
      let prepaymentIsEqual = payloadPrepaymentPerSellOrderBN.eq(new BN(totalPrepayment).div(NUM_SUBORDERS_BN))
      assert.isTrue(
        prepaymentIsEqual,
        "prePayment Problem"
      );

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

      // Execution Time must be correct
      let payloadExecutionTimeBN = new BN(payloadExecutionTime);
      console.log(`Payload Time:    ${payloadExecutionTime}`)
      console.log(`Execution Time:  ${executionTime}`)



      let executionTimeIsEqual = definedExecutionTimeBN.eq(
        payloadExecutionTimeBN
      );

      assert.isTrue(
        executionTimeIsEqual,
        `ExecutionTime Problem: ${definedExecutionTimeBN.toString()}needs to be equal ${payloadExecutionTimeBN.toString()}`
      );

      // Amount must be correct
      let amountIsEqual = SUBORDER_SIZE_BN.eq(new BN(payloadAmount));
      assert.isTrue(amountIsEqual, "Amount Problem in sellOrder");

      // Account for next iteration
      definedExecutionTimeBN = definedExecutionTimeBN.add(
        new BN(INTERVAL_SPAN)
      );

    })

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
        Difference:           ${(userEthBalanceAfter - userEthBalance) /
          10 ** 18} ETH

        WETH Balance Before:  ${userSellTokenBalance / 10 ** 18} WETH
        WETH Balance After:   ${userSellTokenBalanceAfter / 10 ** 18} WETH
        -----------
        Difference:           ${(userSellTokenBalanceAfter -
          userSellTokenBalance) /
          10 ** 18} WETH

        ICE Balance Before:   ${userBuyTokenBalance / 10 ** 18} ICE🍦
        ICE Balance After:    ${userBuyTokenBalanceAfter / 10 ** 18} ICE🍦
        -----------
        Difference:           ${(userBuyTokenBalanceAfter -
          userBuyTokenBalance) /
          10 ** 18} ICE🍦

      EXECUTOR BALANCE:
        ETH Balance Before:   ${executorEthBalance / 10 ** 18} ETH
        ETH Balance After:    ${executorEthBalanceAfter / 10 ** 18} ETH
        -----------
        Difference:           ${(executorEthBalanceAfter - executorEthBalance) /
          10 ** 18} ETH

      ***************************************************+

    `);

    assert.isTrue(true);
  });


});

