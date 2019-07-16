// Script to list the GelatoDXSplitSellAndWithdraw Interface on Gelato Core

// Constants
MAXGAS = 400000; // 400.000

// Truffle Artifacts
const GelatoCore = artifacts.require("GelatoCore");
const GelatoDXSplitSellAndWithdraw = artifacts.require(
  "GelatoDXSplitSellAndWithdraw"
);

contract(
  "gelatoCore.listInterface(_dappInterface, _maxGas) onlyOwner",
  async accounts => {
    it("retrieves deployed GelatoCore and GelatoDXSplitSellAndWithdraw instances", async () => {
      let gelatoCore = await GelatoCore.at(GelatoCore.address);
      let gelatoDXSplitSellAndWithdraw = await GelatoDXSplitSellAndWithdraw.at(
        GelatoDXSplitSellAndWithdraw.address
      );
      assert.equal(gelatoCore.address, GelatoCore.address);
      assert.equal(
        gelatoDXSplitSellAndWithdraw.address,
        GelatoDXSplitSellAndWithdraw.address
      );
      console.log(`GelatoCore.address: ${GelatoCore.address}`);
      console.log(`gelatoCore.address: ${gelatoCore.address}`);
      console.log(`gelatoDXSplitSellAndWithdraw.address: ${gelatoCore.address}`);
      console.log(`gelatoDXSplitSellAndWithdraw.address: ${gelatoCore.address}`);
    });

    /*it("has accounts[0] as owners of Core and Interface", async () => {
      let gelatoCore = await GelatoCore.at(GelatoCore.address);
      let gelatoDXSplitSellAndWithdraw = await GelatoDXSplitSellAndWithdraw.at(
        GelatoDXSplitSellAndWithdraw.address
      );
      let gelatoCoreOwner = await gelatoCore.methods.owner().call();
      let gelatoDXSplitSellAndWithdrawOwner = await gelatoDXSplitSellAndWithdrawOwner.methods
        .owner()
        .call();
      assert.equal(gelatoCoreOwner, gelatoDXSplitSellAndWithdrawOwner, accounts[0])
    });*/

    /*it("lists GelatoDXSplitSellAndWithdraw on GelatoCore with the correct address and maxGas", async () => {
      let gelatoCore = await GelatoCore.at(GelatoCore.address);
      let gelatoDXSplitSellAndWithdraw = await GelatoDXSplitSellAndWithdraw.at(
        GelatoDXSplitSellAndWithdraw.address
      );
      await gelatoCore.methods
        .listInterface(gelatoDXSplitSellAndWithdraw.address, MAXGAS)
        .send({ from: accounts[0] });

      let isWhitelisted = await gelatoCore.methods
        .interfaceWhitelist(gelatoDXSplitSellAndWithdraw.address)
        .call();
      let maxGas = await gelatoCore.methods
        .maxGasByInterface(gelatoDXSplitSellAndWithdraw.address)
        .call(); // uint256

      assert(isWhitelisted);
      assert.equal(MAXGAS, maxGas);
    });*/
  }
);
