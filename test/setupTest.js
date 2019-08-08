// SETUP & Update Tests OF GELATO DUTCH EXCHANGE INTERFACE & Core

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
  orderId,
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

  it("seller is 0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef", async () => {
    assert.strictEqual(seller, "0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef");
  });

  it("Adding 1ETH as balance from gelatoDutchExchange to gelatoCore should work", async () => {
    let messageValue = web3.utils.toWei("1", "ether");
    let messageValueBN = new BN(messageValue);
    let coreOwnerBalanceBefore = await web3.eth.getBalance(gelatoCoreOwner);
    let coreOwnerBalancePreBN = new BN(coreOwnerBalanceBefore.toString());

    // Get gelatoDutchExchange's balance on core before adding a new balance
    let gelatoDutchExchangeBalanceBefore = await gelatoCore.contract.methods
      .getInterfaceBalance(gelatoDutchExchange.address)
      .call();
    let gelatoDutchExchangeBalanceBeforeBN = new BN(
      gelatoDutchExchangeBalanceBefore
    );

    // Let gelatoDutchExchange increase its balance by 1 ETH
    let txGasPrice = await web3.utils.toWei("5", "gwei");
    await gelatoDutchExchange.contract.methods
      .addBalanceToGelato()
      .send({
        from: gelatoCoreOwner,
        value: messageValue,
        gas: 500000,
        gasPrice: txGasPrice
      })
      .once("transactionHash", hash => (txHash = hash))
      .once("receipt", receipt => (txReceipt = receipt))
      .on("error", console.error);

    // Calc how much the core ower paid for the tx
    let coreOwnerTxCost = txGasPrice * txReceipt.gasUsed;
    let coreOwnerTxCostBN = new BN(coreOwnerTxCost);
    // SET GAS PRICE

    // CHECK that core owners ETH balance decreased by 1 ETH + tx fees
    let coreOwnerBalanceAfter = await web3.eth.getBalance(gelatoCoreOwner);
    let coreOwnerBalanceAfterBN = new BN(coreOwnerBalanceAfter.toString());
    let coreOwnerBalanceChangedCorrectly = coreOwnerBalancePreBN
      .sub(messageValueBN)
      .sub(coreOwnerTxCostBN)
      .eq(coreOwnerBalanceAfterBN);

    assert.isTrue(
      coreOwnerBalanceChangedCorrectly,
      `Core Owner's balance must be reduced from ${coreOwnerBalancePreBN} by ${messageValue} to equal ${coreOwnerBalanceAfterBN}`
    );

    // Get gelatoDutchExchange's balance on core after adding a new balance
    let gelatoDutchExchangeBalanceAfter = await gelatoCore.contract.methods
      .getInterfaceBalance(gelatoDutchExchange.address)
      .call();

    let gelatoDutchExchangeBalanceAfterBN = new BN(
      gelatoDutchExchangeBalanceAfter.toString()
    );

    // CHECK that gelatoDutchExchange balance on core has increased by 1ETH
    let gelatoDutchExchangeBalanceChangedCorrectly = gelatoDutchExchangeBalanceBeforeBN
      .add(messageValueBN)
      .eq(gelatoDutchExchangeBalanceAfterBN);
    assert.isTrue(
      gelatoDutchExchangeBalanceChangedCorrectly,
      `Gelato DutchExchange Interface's balance on GelatoCore must have increased from ${gelatoDutchExchangeBalanceBefore} by ${messageValue} to ${gelatoDutchExchangeBalanceAfter}`
    );
  });

  it("Interface can withdraw balance", async () => {
    let messageValue = web3.utils.toWei("0.5", "ether");
    let messageValueBN = new BN(messageValue);

    // Get gelatoDutchExchange's balance on core before adding a new balance
    let gelatoDutchExchangeBalanceBefore = await gelatoCore.contract.methods
      .getInterfaceBalance(gelatoDutchExchange.address)
      .call();
    let gelatoDutchExchangeBalanceBeforeBN = new BN(
      gelatoDutchExchangeBalanceBefore
    );

    // Let gelatoDutchExchange withdraw 0.5 from its balance on the core
    await gelatoDutchExchange.contract.methods
      .withdrawBalanceFromGelato(messageValue)
      .send({ from: gelatoCoreOwner, gas: 500000 })
      .once("transactionHash", hash => (txHash = hash))
      .once("receipt", receipt => (txReceipt = receipt))
      .on("error", console.error);

    // Get gelatoDutchExchange's balance on core after adding a new balance
    let gelatoDutchExchangeBalanceAfter = await gelatoCore.contract.methods
      .getInterfaceBalance(gelatoDutchExchange.address)
      .call();

    let gelatoDutchExchangeBalanceAfterBN = new BN(
      gelatoDutchExchangeBalanceAfter.toString()
    );

    // CHECK that gelatoDutchExchange balance on core has increased by 1ETH
    let gelatoDutchExchangeBalanceChangedCorrectly = gelatoDutchExchangeBalanceBeforeBN
      .sub(messageValueBN)
      .eq(gelatoDutchExchangeBalanceAfterBN);
    assert.isTrue(
      gelatoDutchExchangeBalanceChangedCorrectly,
      `Gelato DutchExchange Interface's balance on GelatoCore must have decreased from ${gelatoDutchExchangeBalanceBefore} by ${messageValue} to ${gelatoDutchExchangeBalanceAfter}`
    );
  });

  it("Interface can add back 0.5 to balance", async () => {
    let messageValue = web3.utils.toWei("0.5", "ether");
    let messageValueBN = new BN(messageValue);
    let coreOwnerBalanceBefore = await web3.eth.getBalance(gelatoCoreOwner);
    let coreOwnerBalancePreBN = new BN(coreOwnerBalanceBefore.toString());

    // Get gelatoDutchExchange's balance on core before adding a new balance
    let gelatoDutchExchangeBalanceBefore = await gelatoCore.contract.methods
      .getInterfaceBalance(gelatoDutchExchange.address)
      .call();
    let gelatoDutchExchangeBalanceBeforeBN = new BN(
      gelatoDutchExchangeBalanceBefore
    );

    // Let gelatoDutchExchange increase its balance by 1 ETH
    let txGasPrice = await web3.utils.toWei("5", "gwei");
    await gelatoDutchExchange.contract.methods
      .addBalanceToGelato()
      .send({
        from: gelatoCoreOwner,
        value: messageValue,
        gas: 500000,
        gasPrice: txGasPrice
      })
      .once("transactionHash", hash => (txHash = hash))
      .once("receipt", receipt => (txReceipt = receipt))
      .on("error", console.error);

    // Calc how much the core ower paid for the tx
    let coreOwnerTxCost = txGasPrice * txReceipt.gasUsed;
    let coreOwnerTxCostBN = new BN(coreOwnerTxCost);
    // SET GAS PRICE

    // CHECK that core owners ETH balance decreased by 1 ETH + tx fees
    let coreOwnerBalanceAfter = await web3.eth.getBalance(gelatoCoreOwner);
    let coreOwnerBalanceAfterBN = new BN(coreOwnerBalanceAfter.toString());
    let coreOwnerBalanceChangedCorrectly = coreOwnerBalancePreBN
      .sub(messageValueBN)
      .sub(coreOwnerTxCostBN)
      .eq(coreOwnerBalanceAfterBN);

    assert.isTrue(
      coreOwnerBalanceChangedCorrectly,
      `Core Owner's balance must be reduced from ${coreOwnerBalancePreBN} by ${messageValue} to equal ${coreOwnerBalanceAfterBN}`
    );

    // Get gelatoDutchExchange's balance on core after adding a new balance
    let gelatoDutchExchangeBalanceAfter = await gelatoCore.contract.methods
      .getInterfaceBalance(gelatoDutchExchange.address)
      .call();

    let gelatoDutchExchangeBalanceAfterBN = new BN(
      gelatoDutchExchangeBalanceAfter.toString()
    );

    // CHECK that gelatoDutchExchange balance on core has increased by 1ETH
    let gelatoDutchExchangeBalanceChangedCorrectly = gelatoDutchExchangeBalanceBeforeBN
      .add(messageValueBN)
      .eq(gelatoDutchExchangeBalanceAfterBN);
    assert.isTrue(
      gelatoDutchExchangeBalanceChangedCorrectly,
      `Gelato DutchExchange Interface's balance on GelatoCore must have increased from ${gelatoDutchExchangeBalanceBefore} by ${messageValue} to ${gelatoDutchExchangeBalanceAfter}`
    );
  });

  it("GelatoCore can update gelatoGasPrice", async () => {
    // Getter
    let gelatoGasPriceBefore = await gelatoCore.contract.methods
      .gelatoGasPrice()
      .call();
    // Update
    let newGasPrice = web3.utils.toWei("100", "gwei");
    await gelatoCore.contract.methods
      .updateGelatoGasPrice(newGasPrice)
      .send({ from: gelatoCoreOwner, gas: 5000000 });
    // Getter
    let gelatoGasPriceAfter = await gelatoCore.contract.methods
      .gelatoGasPrice()
      .call();
    assert.notEqual(
      gelatoGasPriceBefore,
      gelatoGasPriceAfter,
      "New Gas price should be differnt to old one"
    );
    assert.equal(
      newGasPrice,
      gelatoGasPriceAfter,
      "GelatoGasPrice should be updateable"
    );

    // Switch GasPrice back to 5
    let oldGasPrice = web3.utils.toWei("20", "gwei");
    await gelatoCore.contract.methods
      .updateGelatoGasPrice(oldGasPrice)
      .send({ from: gelatoCoreOwner, gas: 5000000 });
  });

  it("GelatoCore can update GelatoExecutionMargin", async () => {
    // Getter
    let gelatoExecutionMarginBefore = await gelatoCore.contract.methods
      .gelatoExecutionMargin()
      .call();
    // Update
    let newExecutionMargin = 1000000000000000; // 1 Finney
    await gelatoCore.contract.methods
      .updateGelatoExecutionMargin(newExecutionMargin)
      .send({ from: gelatoCoreOwner, gas: 5000000 });
    // Getter
    let gelatoExecutionMarginAfter = await gelatoCore.contract.methods
      .gelatoExecutionMargin()
      .call();
    assert.notEqual(
      gelatoExecutionMarginBefore,
      gelatoExecutionMarginAfter,
      "New Execution Marginn should be differnt to old one"
    );
    assert.equal(
      newExecutionMargin,
      gelatoExecutionMarginAfter,
      "gelatoExecutionMargin should be updateable"
    );
  });

  it("GelatoCore can update GelatoMaxGasPrice", async () => {
    // Getter
    let gelatoMaxGasPriceBefore = await gelatoCore.contract.methods
      .gelatoMaxGasPrice()
      .call();
    // Update
    let maxGasPrice = web3.utils.toWei("70", "gwei");
    await gelatoCore.contract.methods
      .updateGelatoMaxGasPrice(maxGasPrice)
      .send({ from: gelatoCoreOwner, gas: 5000000 });
    // Getter
    let gelatoMaxGasPrice = await gelatoCore.contract.methods
      .gelatoMaxGasPrice()
      .call();
    assert.notEqual(
      gelatoMaxGasPriceBefore,
      gelatoMaxGasPrice,
      "New Gas price should be differnt to old one"
    );
    assert.equal(
      maxGasPrice,
      gelatoMaxGasPrice,
      "GelatoMaxGasPrice should be updateable"
    );
  });


  it("GelatoDutchExchangeInterface can switch from using gelato Cores gasPrice to using its own", async () => {
    // Getter
    let gdxGelatoPrepayment1 = await gelatoDutchExchange.contract.methods
      .calcGelatoPrepayment()
      .call();
    // Update
    let newGasPrice = await web3.utils.toWei("70", "gwei");
    await gelatoDutchExchange.contract.methods
      .useIndividualGasPrice(newGasPrice)
      .send({ from: gelatoCoreOwner, gas: 5000000 });
    // Getter
    let gdxGelatoPrepayment2 = await gelatoDutchExchange.contract.methods
      .calcGelatoPrepayment()
      .call();

    let newGasPriceBN = new BN(newGasPrice);
    let gdxGelatoPrepayment2BN = new BN(gdxGelatoPrepayment2.toString());
    let maxGasBN = new BN(500000);

    let predictedGDXGelatoPrepayment = newGasPriceBN
      .mul(maxGasBN)
      .eq(gdxGelatoPrepayment2BN);
    assert.isTrue(
      predictedGDXGelatoPrepayment,
      `${newGasPriceBN} * ${maxGasBN} should be equal to ${gdxGelatoPrepayment2BN}`
    );

    assert.notEqual(
      gdxGelatoPrepayment1,
      gdxGelatoPrepayment2,
      "New Gas price should be differnt to old one"
    );
    // assert.equal(maxSellOrders, gdxMaxSellOrdersAfter, "GelatoMaxGasPrice should be updateable")
  });

  it("GelatoDutchExchangeInterface can switch from using its own gasPrice to gelatoCore's one", async () => {
    // Getter
    let gdxGelatoPrepayment1 = await gelatoDutchExchange.contract.methods
      .calcGelatoPrepayment()
      .call();
    // Update
    await gelatoDutchExchange.contract.methods
      .useGelatoGasPrice()
      .send({ from: gelatoCoreOwner, gas: 5000000 });
    // Getter
    let gdxGelatoPrepayment2 = await gelatoDutchExchange.contract.methods
      .calcGelatoPrepayment()
      .call();

    let gdxGelatoPrepayment2BN = new BN(gdxGelatoPrepayment2.toString());
    let maxGasBN = new BN(500000);

    // USE GELATO_GAS_PRICE_BN as gasPrice, as it is the one in gelatoCore
    let currentGelatoGasPrice = await gelatoCore.contract.methods
      .gelatoGasPrice()
      .call();
    let currentGelatoGasPriceBN = new BN(currentGelatoGasPrice.toString());
    let predictedGDXGelatoPrepayment = currentGelatoGasPriceBN
      .mul(maxGasBN)
      .eq(gdxGelatoPrepayment2BN);
    assert.isTrue(
      predictedGDXGelatoPrepayment,
      `${currentGelatoGasPriceBN} * ${maxGasBN} should be equal to ${gdxGelatoPrepayment2BN}`
    );

    assert.notEqual(
      gdxGelatoPrepayment1,
      gdxGelatoPrepayment2,
      "New Gas price should be differnt to old one"
    );
    // assert.equal(maxSellOrders, gdxMaxSellOrdersAfter, "GelatoMaxGasPrice should be updateable")
  });


});
