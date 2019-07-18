/** Automated integration test for GelatoDxSplitSellAndWithdraw
 * Tested:
 * Default deployed instances
 * Gelato Core updateability test suite
 * GelatoDXSplitSellAndWithdraw initiated
 * splitSellOrder()
 * On Core effect:
 * GelatoCore.mintClaim() test coverage:
 * GelatoCore initiated
 * IcedOut(GelatoDXSplitSellAndWithdraw).execute()
 * On Interface effect:
 * GelatoDXSplitSellAndWithdraw.execute() test coverage:
 * automated withdrawals
 *  */

// Constants
// GELATO_GAS_PRICE:
//  This is a state variable that got deployed with truffle migrate
//  and was set inside 3_deploy_gelato.js. We should import this variable
//  instead of hardcoding it.
const GELATO_GAS_PRICE = web3.utils.toWei("5", "gwei");
const GELATO_GAS_PRICE_UPDATE = web3.utils.toWei("10", "gwei");

// Interface exsample MaxGas
const MAXGAS = 400000; // 400.000
const MAXGAS_UPDATE = 500000; // 500.000

// Truffle Artifacts
const GelatoCore = artifacts.require("GelatoCore");
const GelatoDXSplitSellAndWithdraw = artifacts.require(
  "GelatoDXSplitSellAndWithdraw"
);

// State shared across the unit tests
// Deployed contract instances
let gelatoCore;
let gelatoDXSplitSellAndWithdraw;
// Deployed instances owners
let gelatoCoreOwner;
let gelatoDXSplitSellAndWithdrawOwner;
// Account used for non-ownership prevention tests
let notOwner;

// test suite for GelatoCore updateability
contract("GelatoCore.sol Core Updateability tests", async accounts => {
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

  // ******** updateGelatoGasPrice tests ********
  it(`lets Core-owner update the gelatoGasPrice
  Event LogGelatoGasPriceUpdate:
  expected newGelatoGasPrice: ${GELATO_GAS_PRICE_UPDATE}`, async () => {
    let gelatoGasPriceBefore = await gelatoCore.contract.methods
      .getGelatoGasPrice()
      .call();

    // Assumption needs to hold true for test to be feasible
    assert.notEqual(
      gelatoGasPriceBefore,
      GELATO_GAS_PRICE_UPDATE,
      "expected gelatoGasPriceBefore and GELATO_GAS_PRICE_UPDATE not to be equal"
    );

    await gelatoCore.contract.methods
      .updateGelatoGasPrice(GELATO_GAS_PRICE_UPDATE)
      .send({ from: gelatoCoreOwner });

    let gelatoGasPriceAfter = await gelatoCore.contract.methods
      .getGelatoGasPrice()
      .call();

    assert.equal(gelatoGasPriceAfter, GELATO_GAS_PRICE_UPDATE);
  });

  it("prevents not-Core-owners from updating gelatoGasPrice", async () => {
    try {
      await gelatoCore.contract.methods
        .updateGelatoGasPrice(gelatoDXSplitSellAndWithdraw.address)
        .send({ from: notOwner });
      // let it fail if call was successfull
      assert.fail(
        "GelatoCore bug: should not allow not-Core-owners to update gelatoGasPrice"
      );
    } catch (err) {
      assert(err);
    }
  });
  // ******** updateGelatoGasPrice tests END ********

  // ******** (un)listInterface tests ********
  it(`lets Core-owner list gelatoDXSplitSellAndWithdraw on GelatoCore with its maxGas set
  Event LogNewInterfaceListed:
  expected indexed address:  ${GelatoDXSplitSellAndWithdraw.address}
  expected interface maxGas: ${MAXGAS}`, async () => {
    await gelatoCore.contract.methods
      .listInterface(gelatoDXSplitSellAndWithdraw.address, MAXGAS)
      .send({ from: gelatoCoreOwner });

    let isWhitelisted = await gelatoCore.contract.methods
      .getInterfaceWhitelist(gelatoDXSplitSellAndWithdraw.address)
      .call();
    let maxGas = await gelatoCore.contract.methods
      .getInterfaceMaxGas(gelatoDXSplitSellAndWithdraw.address)
      .call(); // uint256

    assert.isTrue(isWhitelisted);
    assert.equal(MAXGAS, maxGas);
  });

  it("prevents not-Core-owners from unlisting interfaces", async () => {
    try {
      await gelatoCore.contract.methods
        .unlistInterface(gelatoDXSplitSellAndWithdraw.address)
        .send({ from: notOwner });
      // let it fail if call was successfull
      assert.fail(
        "GelatoCore bug: should not allow not-Core-owners to unlist interfaces"
      );
    } catch (err) {
      assert(err);
    }
  });

  // ******** interface maxGas update tests ********
  it(`lets Core-owner update the maxGas of an interface
  Event LogMaxGasUpdate:
  expected indexed address: ${GelatoDXSplitSellAndWithdraw.address}
  expected newMaxGas:       ${MAXGAS_UPDATE}`, async () => {
    // assumptions need to hold true for feasibility
    let maxGasBefore = await gelatoCore.contract.methods
      .getInterfaceMaxGas(gelatoDXSplitSellAndWithdraw.address)
      .call();
    assert.equal(maxGasBefore, MAXGAS);
    assert.notEqual(maxGasBefore, MAXGAS_UPDATE);

    await gelatoCore.contract.methods
      .updateMaxGas(gelatoDXSplitSellAndWithdraw.address, MAXGAS_UPDATE)
      .send({ from: gelatoCoreOwner });

    let maxGasAfter = await gelatoCore.contract.methods
      .getInterfaceMaxGas(gelatoDXSplitSellAndWithdraw.address)
      .call();

    assert.equal(maxGasAfter, MAXGAS_UPDATE);
  });

  it("prevents not-Core-owners from updating the maxGas of an interface", async () => {
    try {
      await gelatoCore.contract.methods
        .updateMaxGas(gelatoDXSplitSellAndWithdraw.address, MAXGAS_UPDATE)
        .send({ from: notOwner });
      // let it fail if call was successfull
      assert.fail(
        "GelatoCore bug: should not allow not-Core-owners to update interface maxGas"
      );
    } catch (err) {
      assert(err);
    }
  });
  // ******** interface maxGas update tests END ********

  it(`lets Core-owner unlist an interface removing its maxGas entry
  Event LogInterfaceUnlisted:
  expected indexed address: ${GelatoDXSplitSellAndWithdraw.address}
  expected value noMaxGas:  0`, async () => {
    await gelatoCore.contract.methods
      .unlistInterface(gelatoDXSplitSellAndWithdraw.address)
      .send({ from: gelatoCoreOwner });

    isWhitelisted = await gelatoCore.contract.methods
      .getInterfaceWhitelist(gelatoDXSplitSellAndWithdraw.address)
      .call();
    maxGas = await gelatoCore.contract.methods
      .getInterfaceMaxGas(gelatoDXSplitSellAndWithdraw.address)
      .call(); // uint256

    assert.isFalse(isWhitelisted);
    assert.equal(maxGas, 0);
  });

  it("prevents not-Core-owners from listing interfaces", async () => {
    try {
      await gelatoCore.contract.methods
        .listInterface(gelatoDXSplitSellAndWithdraw.address, MAXGAS)
        .send({ from: notOwner });
      // let it fail if call was successfull
      assert.fail(
        "GelatoCore bug: should not allow not-Core-owners to list interfaces"
      );
    } catch (err) {
      assert(err);
    }
  });
  // ******** (un)listInterface tests END ********
});
