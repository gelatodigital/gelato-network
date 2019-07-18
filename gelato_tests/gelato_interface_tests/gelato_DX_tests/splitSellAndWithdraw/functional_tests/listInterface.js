// Script to list the GelatoDXSplitSellAndWithdraw Interface on Gelato Core

// Artifacts
const GelatoCore = artifacts.require("GelatoCore");
const GelatoDXSplitSellAndWithdraw = artifacts.require(
  "GelatoDXSplitSellAndWithdraw"
);

module.exports = () => {
  async function listInterface() {
    const gelatoCore = await GelatoCore.at(GelatoCore.address);
    const gelatoDXSplitSellAndWithdraw = await GelatoDXSplitSellAndWithdraw.at(
      GelatoDXSplitSellAndWithdraw.address
    );

    const accounts = await web3.eth.getAccounts();
    const gelatoCoreOwner = accounts[0];

    

  }

  listInterface().then(result => {
    console.log(result);
  });
};
