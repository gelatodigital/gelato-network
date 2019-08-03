// Minting Test

/*
 */

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
  execShellCommand,
  DxGetter,
  execShellCommandLog
} = require("./truffleTestConfig.js");

let txHash;
let txReceipt;

describe("Test the successful setup of gelatoDutchExchangeInterface (gdx)", () => {
  // ******** Deploy new instances Test ********
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

  it("Mint 4 execution claims with 2 sell orders on GDX", async () => {
    // Getch gelatoDutchExchange balance
    let gelatoCoreBalancePre = new BN(
      await web3.eth.getBalance(gelatoDutchExchange.address)
    );

    // Now set the executiontime
    blockNumber = await web3.eth.getBlockNumber();
    block = await web3.eth.getBlock(blockNumber);
    timestamp = block.timestamp;
    executionTime = timestamp + 15; // must be >= now (latency)

    // Seller external TX2:
    // benchmarked gasUsed = 726,360 (for 2 subOrders + 1 lastWithdrawal)

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
        .send({ from: seller, value: MSG_VALUE_BN, gas: 2000000 }) // gas needed to prevent out of gas error
        .once("transactionHash", hash => (txHash = hash))
        .once("receipt", receipt => (txReceipt = receipt))
        .on("error", console.error);

        // Check that gelatoCore has received msg.value funds in its balance
    let gelatoCoreBalancePost = new BN(
      await web3.eth.getBalance(gelatoDutchExchange.address)
    );

    assert.strictEqual(
      gelatoCoreBalancePost.toString(),
      gelatoCoreBalancePre.add(MSG_VALUE_BN).toString(),
      "gelatoCore ether balance problem"
    );

    await gelatoCore.getPastEvents("LogNewExecutionClaimMinted", (error, events) => {
        events.forEach(async (event) => {
            let expectedExecutionId = await gelatoCore.contract.methods.getCurrentExecutionClaimId().call()
            assert.strictEqual(
                event.returnValues.dappInterface,
                gelatoDutchExchange.address,
                "LogExecutionClaimMinted dappInterface problem"
            );
            assert.strictEqual(
                event.returnValues.executionClaimId,
                expectedExecutionId,
                "LogExecutionClaimMinted executionClaimId problem"
            );
            let returnedFuncSig = event.returnValues.functionSignature
            if ( parseInt(event.returnValues.executionClaimId) % 2 !== 0 )
            {
                assert.strictEqual(
                    returnedFuncSig,
                    await web3.eth.abi.encodeFunctionCall({
                        name: 'execDepositAndSell',
                        type: 'function',
                        inputs: [{
                            type: 'uint256',
                            name: '_executionClaimId'
                        }]
                    }, returnedFuncSig), "LogExecutionClaimMinted functionSignature problem");
            }
            else
            {
                assert.strictEqual(
                    returnedFuncSig,
                    await web3.eth.abi.encodeFunctionCall({
                        name: 'execWithdraw',
                        type: 'function',
                        inputs: [{
                            type: 'uint256',
                            name: '_executionClaimId'
                        }]
                    }, returnedFuncSig), "LogExecutionClaimMinted functionSignature problem");

            }
        })
    })


  });


});
