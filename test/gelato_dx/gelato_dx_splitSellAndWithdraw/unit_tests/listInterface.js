/** Automated tests for
 * Gelato.listInterface(address _dappInterface, uint256 _maxGas)) onlyOwner
 * Gelato.unlistInterface(address _dappInterface)) onlyOwner
 * */

// Constants
MAXGAS = 400000; // 400.000

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

// suite for contract instance setup
contract("GelatoCore whitelist logic tests", async accounts => {
  // suite root-level pre-hook: set the test suite variables to be shared among all tests
  before(async () => {
    gelatoCore = await GelatoCore.deployed();
    gelatoDXSplitSellAndWithdraw = await GelatoDXSplitSellAndWithdraw.deployed();
  });

  // tests for contract instance setup
  it("retrieves deployed GelatoCore and GelatoDXSplitSellAndWithdraw instances", async () => {
    assert.isOk(gelatoCore.address);
    assert.isOk(gelatoDXSplitSellAndWithdraw.address);
    assert.equal(gelatoCore.address, GelatoCore.address);
    assert.equal(
      gelatoDXSplitSellAndWithdraw.address,
      GelatoDXSplitSellAndWithdraw.address
    );
  });

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

  // listInterface tests
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
      assert(err, `Expected error (not owner) - result: ${err}`);
    }
  });

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
      assert(err, `Expected error (not owner) - result: ${err}`);
    }
  });
});
