// Automated tests for Gelato Core updateability functions

// Big Number stuff
const BN = web3.utils.BN;

// Constants
GELATO_GAS_PRICE_UPDATE = web3.utils.toWei("10", "gwei");
MAXGAS = 400000; // 400.000
MAXGAS_UPDATE = 500000; // 500.000

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

// test suite for GelatoCore updateability
contract("GelatoCore.sol Core Updateability tests", async accounts => {
  // suite root-level pre-hook: set the test suite variables to be shared among all tests
  before(async () => {
    gelatoCore = await GelatoCore.deployed();
    gelatoDXSplitSellAndWithdraw = await GelatoDXSplitSellAndWithdraw.deployed();
  });

  // ******** deployed instances tests ********
  it("retrieves deployed GelatoCore and GelatoDXSplitSellAndWithdraw instances", async () => {
    assert.exists(gelatoCore.address);
    assert.exists(gelatoDXSplitSellAndWithdraw.address);
    assert.equal(gelatoCore.address, GelatoCore.address);
    assert.equal(
      gelatoDXSplitSellAndWithdraw.address,
      GelatoDXSplitSellAndWithdraw.address
    );
  });
  // ******** deployed instances tests END ********

  // ******** ownership tests ********
  it("has accounts[0] as owners of Core and Interface", async () => {
    gelatoCoreOwner = await gelatoCore.contract.methods.owner().call();
    gelatoDXSplitSellAndWithdrawOwner = await gelatoDXSplitSellAndWithdraw.contract.methods
      .owner()
      .call();

    assert.equal(
      gelatoCoreOwner,
      gelatoDXSplitSellAndWithdrawOwner,
      accounts[0]
    );
  });
  // ******** ownership tests END ********

  // ******** updateGelatoGasPrice tests ********
  it("lets owner update the gelatoGasPrice", async () => {
    const gasBefore = await gelatoCore.contract.methods.gelatoGasPrice.call();
    // Assumption needs to hold true for test to be feasible
    assert.notEqual(
      gasBefore,
      GELATO_GAS_PRICE_UPDATE,
      "expected gasBefore and GELATO_GAS_PRICE_UPDATE not to be equal"
    );

    await gelatoCore.contract.methods
      .updateGelatoGasPrice(GELATO_GAS_PRICE_UPDATE)
      .send({ from: gelatoCoreOwner });

    let gasAfter = await gelatoCore.contract.methods.gelatoGasPrice.call();

    assert.equal(gasAfter, GELATO_GAS_PRICE_UPDATE);
  });

  it("prevents non-owners from updating gelatoGasPrice", async () => {
    try {
      await gelatoCore.contract.methods
        .updateGelatoGasPrice(gelatoDXSplitSellAndWithdraw.address)
        .send({ from: accounts[1] });
      // let it fail if call was successfull
      assert.fail(
        "GelatoCore bug: should not allow non-owners to unlist interfaces"
      );
    } catch (err) {
      assert(err);
    }
  });
  // ******** updateGelatoGasPrice tests END ********

  // ******** (un)listInterface tests ********
  it("lets owner list GelatoDXSplitSellAndWithdraw on GelatoCore with its maxGas set", async () => {
    await gelatoCore.contract.methods
      .listInterface(gelatoDXSplitSellAndWithdraw.address, MAXGAS)
      .send({ from: gelatoCoreOwner });

    let isWhitelisted = await gelatoCore.contract.methods
      .interfaceWhitelist(gelatoDXSplitSellAndWithdraw.address)
      .call();
    let maxGas = await gelatoCore.contract.methods
      .maxGasByInterface(gelatoDXSplitSellAndWithdraw.address)
      .call(); // uint256

    assert.isTrue(isWhitelisted);
    assert.equal(MAXGAS, maxGas);
  });

  it("prevents non-owners from unlisting interfaces", async () => {
    try {
      await gelatoCore.contract.methods
        .unlistInterface(gelatoDXSplitSellAndWithdraw.address)
        .send({ from: accounts[1] });
      // let it fail if call was successfull
      assert.fail(
        "GelatoCore bug: should not allow non-owners to unlist interfaces"
      );
    } catch (err) {
      assert(err);
    }
  });

  it("lets owners update the maxGas of an interface", async () => {});

  it("lets owner unlist GelatoDXSplitSellAndWithdraw removing its MaxGas entry", async () => {
    await gelatoCore.contract.methods
      .unlistInterface(gelatoDXSplitSellAndWithdraw.address)
      .send({ from: gelatoCoreOwner });

    isWhitelisted = await gelatoCore.contract.methods
      .interfaceWhitelist(gelatoDXSplitSellAndWithdraw.address)
      .call();
    maxGas = await gelatoCore.contract.methods
      .maxGasByInterface(gelatoDXSplitSellAndWithdraw.address)
      .call(); // uint256

    assert.isFalse(isWhitelisted);
    assert.equal(maxGas, 0);
  });

  it("prevents non-owners from listing interfaces", async () => {
    try {
      await gelatoCore.contract.methods
        .listInterface(gelatoDXSplitSellAndWithdraw.address, MAXGAS)
        .send({ from: accounts[1] });
      // let it fail if call was successfull
      assert.fail(
        "GelatoCore bug: should not allow non-owners to list interfaces"
      );
    } catch (err) {
      assert(err);
    }
  });
  // ******** (un)listInterface tests END ********
});
