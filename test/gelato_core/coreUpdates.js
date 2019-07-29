// Automated tests for Gelato Core updateability functions

// Constants
// GELATO_GAS_PRICE:
//  This is a state variable that got deployed with truffle migrate
//  and was set inside 3_deploy_gelato.js. We should import this variable
//  instead of hardcoding it.
//  It should match the truffle.js specified DEFAULT_GAS_PRICE_GWEI = 5
const GELATO_GAS_PRICE = web3.utils.toWei("5", "gwei");
const GELATO_GAS_PRICE_UPDATE = web3.utils.toWei("10", "gwei");

// Interface exsample MaxGas
const MAXGAS = 400000; // 400.000
const MAXGAS_UPDATE = 500000; // 500.000

// Truffle Artifacts
const GelatoCore = artifacts.require("GelatoCore");
const GelatoDutchX = artifacts.require("GelatoDutchX");

// State shared across the unit tests
const gelatoInterfaceAddress = GelatoDutchX.address;

// Deployed contract instances
let gelatoCore;
let gelatoDutchX;
// Deployed instances owners
let gelatoCoreOwner;
let gelatoDutchXOwner;
// Account used for non-ownership prevention tests
let notOwner;

// Default test suite
contract(
  "default test suite: correct deployed instances and owners",
  async accounts => {
    // suite root-level pre-hook: set the test suite variables to be shared among all tests
    before(async () => {
      gelatoCore = await GelatoCore.deployed();
      gelatoDutchX = await GelatoDutchX.deployed();
    });

    // ******** Default deployed instances tests ********
    it("retrieves deployed GelatoCore and GelatoInterface instances", async () => {
      assert.exists(gelatoCore.address);
      assert.exists(gelatoDutchX.address);
      assert.equal(gelatoCore.address, GelatoCore.address);
      assert.equal(gelatoDutchX.address, GelatoDutchX.address);
    });
    // ******** Default deployed instances tests END ********

    // ******** Default ownership tests ********
    it("has accounts[0] as owners of GelatoCore and GelatoInterface and accounts[1] is not owner", async () => {
      gelatoCoreOwner = await gelatoCore.contract.methods.owner().call();
      gelatoDutchXOwner = await gelatoDutchX.contract.methods.owner().call();

      assert.equal(gelatoCoreOwner, accounts[0]);
      assert.equal(gelatoDutchXOwner, accounts[0]);

      assert.notEqual(
        gelatoCoreOwner,
        accounts[1],
        "accounts[1] was expected not to be gelatoCoreOwner"
      );
      assert.notEqual(
        gelatoDutchXOwner,
        accounts[1],
        "accounts[1] was not expected to be gelatoDutchXOwner"
      );

      notOwner = accounts[1];
    });
    // ******** Default ownership tests END ********
  }
);

// Test suite for GelatoCore updateability
contract("GelatoCore.sol Core Updateability tests", async accounts => {
  // suite root-level pre-hook: set the test suite variables to be shared among all tests
  before(async () => {
    gelatoCore = await GelatoCore.deployed();
    gelatoDutchX = await GelatoDutchX.deployed();
  });

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
        .updateGelatoGasPrice(gelatoDutchX.address)
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
  it(`lets Core-owner list gelatoDutchX on GelatoCore with its maxGas set
  Event LogNewInterfaceListed:
  expected indexed address:  ${gelatoInterfaceAddress}
  expected interface maxGas: ${MAXGAS}`, async () => {
    await gelatoCore.contract.methods
      .listInterface(gelatoDutchX.address, MAXGAS)
      .send({ from: gelatoCoreOwner });

    let isWhitelisted = await gelatoCore.contract.methods
      .getInterfaceWhitelist(gelatoDutchX.address)
      .call();
    let maxGas = await gelatoCore.contract.methods
      .getInterfaceMaxGas(gelatoDutchX.address)
      .call(); // uint256

    assert.isTrue(isWhitelisted);
    assert.equal(MAXGAS, maxGas);
  });

  it("prevents not-Core-owners from unlisting interfaces", async () => {
    try {
      await gelatoCore.contract.methods
        .unlistInterface(gelatoDutchX.address)
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
  expected indexed address: ${gelatoInterfaceAddress}
  expected newMaxGas:       ${MAXGAS_UPDATE}`, async () => {
    // assumptions need to hold true for feasibility
    let maxGasBefore = await gelatoCore.contract.methods
      .getInterfaceMaxGas(gelatoDutchX.address)
      .call();
    assert.equal(maxGasBefore, MAXGAS);
    assert.notEqual(maxGasBefore, MAXGAS_UPDATE);

    await gelatoCore.contract.methods
      .updateMaxGas(gelatoDutchX.address, MAXGAS_UPDATE)
      .send({ from: gelatoCoreOwner });

    let maxGasAfter = await gelatoCore.contract.methods
      .getInterfaceMaxGas(gelatoDutchX.address)
      .call();

    assert.equal(maxGasAfter, MAXGAS_UPDATE);
  });

  it("prevents not-Core-owners from updating the maxGas of an interface", async () => {
    try {
      await gelatoCore.contract.methods
        .updateMaxGas(gelatoDutchX.address, MAXGAS_UPDATE)
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
  expected indexed address: ${gelatoInterfaceAddress}
  expected value noMaxGas:  0`, async () => {
    await gelatoCore.contract.methods
      .unlistInterface(gelatoDutchX.address)
      .send({ from: gelatoCoreOwner });

    isWhitelisted = await gelatoCore.contract.methods
      .getInterfaceWhitelist(gelatoDutchX.address)
      .call();
    maxGas = await gelatoCore.contract.methods
      .getInterfaceMaxGas(gelatoDutchX.address)
      .call(); // uint256

    assert.isFalse(isWhitelisted);
    assert.equal(maxGas, 0);
  });

  it("prevents not-Core-owners from listing interfaces", async () => {
    try {
      await gelatoCore.contract.methods
        .listInterface(gelatoDutchX.address, MAXGAS)
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
