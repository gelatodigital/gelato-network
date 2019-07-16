// Script to list the GelatoDXSplitSellAndWithdraw Interface on Gelato Core

// Module Imports
const assert = require("assert");

// Truffle Artifacts
const GelatoCore = artifacts.require("GelatoCore");
const GelatoDXSplitSellAndWithdraw = artifacts.require(
  "GelatoDXSplitSellAndWithdraw"
);

// Constants
MAXGAS = 400000; // 400.000

// Set before Each
let accounts;
let gelatoCore;
let gelatoDXSplitSellAndWithdraw;
let gelatoCoreOwner;
let gelatoDXSplitSellAndWithdrawOwner;

// fetch accounts, Core and Interface contracts before each test
beforeEach(async () => {
  accounts = await web3.eth.getAccounts();

  // Fetch gelatoCore and gelatoInterface from blockchain
  gelatoCore = await GelatoCore.at(GelatoCore.address);
  gelatoDXSplitSellAndWithdraw = await GelatoDXSplitSellAndWithdraw.at(
    GelatoDXSplitSellAndWithdraw.address
  );

  // Check that latters' owners are accounts[0] (as per 3_deploy_gelato.js)
  gelatoCoreOwner = await GelatoCore.owner().call();
  gelatoDXSplitSellAndWithdrawOwner = await gelatoDXSplitSellAndWithdrawOwner.methods.owner().call();
  assert.equal(gelatoCoreOwner, gelatoDXSplitSellAndWithdrawOwner, accounts[0]);
});

describe("gelatoCore.listInterface(_dappInterface, _maxGas) onlyOwner", () => {
  it("retrieves deployed GelatoCore and GelatoDXSplitSellAndWithdraw instances", async () => {
    assert.ok(gelatoCore.address);
    assert.ok(GelatoDXSplitSellAndWithdraw.address);
  });

  it("lists GelatoDXSplitSellAndWithdraw on GelatoCore with the correct address and maxGas", async () => {
    await gelatoCore.listInterface(
      gelatoDXSplitSellAndWithdraw.address,
      MAXGAS,
      { from: gelatoCoreOwner }
    );

    let interface = await gelatoCore.interfaceWhitelist(
      gelatoDXSplitSellAndWithdraw.address
    ); // boolean
    let maxGas = await gelatoCore.maxGasByInterface(
      gelatoDXSplitSellAndWithdraw.address
    ); // uint256

    assert(interface);
    assert.equal(MAXGAS, maxGas);
  });
});
