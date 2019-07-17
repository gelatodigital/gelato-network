// Script to list the GelatoDXSplitSellAndWithdraw Interface on Gelato Core

// imports
const assert = require("assert");

// Constants
MAXGAS = 400000; // 400.000

// Truffle Artifacts
const GelatoCore = artifacts.require("GelatoCore");
const GelatoDXSplitSellAndWithdraw = artifacts.require(
  "GelatoDXSplitSellAndWithdraw"
);

// State shared across the unit tests
let accounts;
let gelatoCore;
let gelatoDXSplitSellAndWithdraw;
let gelatoCoreOwner;
let gelatoDXSplitSellAndWithdrawOwner;

// suite root-level pre-hook: set the test suite variables to be shared among all tests
before(async () => {
  // Ethereum accounts
  accounts = await web3.eth.getAccounts();

  // Deployed contract instances
  gelatoCore = await GelatoCore.deployed();
  gelatoDXSplitSellAndWithdraw = await GelatoDXSplitSellAndWithdraw.deployed();

  // Contract owners
  gelatoCoreOwner = accounts[0];
  gelatoDXSplitSellAndWithdrawOwner = gelatoCoreOwner;
});

// suite
describe("gelatoCore.listInterface(_dappInterface, _maxGas) onlyOwner", () => {
  // tests
  it("retrieves deployed GelatoCore and GelatoDXSplitSellAndWithdraw instances", async () => {
    assert.ok(gelatoCore.address);
    assert.ok(gelatoDXSplitSellAndWithdraw.address);
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

  it("lets owner list GelatoDXSplitSellAndWithdraw on GelatoCore with the correct address and maxGas", async () => {
    await gelatoCore.contract.methods
      .listInterface(gelatoDXSplitSellAndWithdraw.address, MAXGAS)
      .send({ from: gelatoCoreOwner });

    let isWhitelisted = await gelatoCore.contract.methods
      .interfaceWhitelist(gelatoDXSplitSellAndWithdraw.address)
      .call();
    let maxGas = await gelatoCore.contract.methods
      .maxGasByInterface(gelatoDXSplitSellAndWithdraw.address)
      .call(); // uint256

    assert(isWhitelisted);
    assert.equal(MAXGAS, maxGas);
  });
});
