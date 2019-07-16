// Script to list the GelatoDXSplitSellAndWithdraw Interface on Gelato Core

// Module Imports
const assert = require('assert');

// Truffle Artifacts
const GelatoCore = artifacts.require("GelatoCore");
const GelatoDXSplitSellAndWithdraw = artifacts.require(
  "GelatoDXSplitSellAndWithdraw"
);

// Constants
MAXGAS = 400000; // 400.000

// Set before Each
let accounts;
let gelatoCoreOwner;
let gelatoCore;
let gelatoDXSplitSellAndWithdraw;

// fetch accounts, Core and Interface contracts before each test
beforeEach(async () => {
  accounts = await web3.eth.getAccounts();
  gelatoCoreOwner = accounts[0];
  gelatoCore = await GelatoCore.at(GelatoCore.address);
  gelatoDXSplitSellAndWithdraw = await GelatoDXSplitSellAndWithdraw.at(
    GelatoDXSplitSellAndWithdraw.address
  );
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
    );  // boolean
    let maxGas = await gelatoCore.maxGasByInterface(
      gelatoDXSplitSellAndWithdraw.address
    );  // uint256

    assert(interface);
    assert.equal(MAXGAS, maxGas);
  });
});
