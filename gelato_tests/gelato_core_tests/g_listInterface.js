/* Gelato createSellOrder script
    @dev: Terminal command to run this script:
    Terminal window 1: watch this for stdout from GelatoCore and GELATO_DX
    * yarn rpc
    Terminal window 2: watch this for stdout from createSellOrder.js file.
    * yarn setup
    * truffle exec ./createSellOrder.js
*/
// ********** Truffle/web3 setup END ********
// ethereum accounts
let accounts;
// To be set variables
// Prior to GelatoCore.listInterface:
let gelatoCoreOwner; // accounts[0]
let gDXSSAWOwner; // accounts[0]

// Deployed contract instances
// Gelato
const GelatoCore = artifacts.require("GelatoCore");
const GELATO_CORE = "0x74e3FC764c2474f25369B9d021b7F92e8441A2Dc";
let gelatoCore;

const GelatoDutchX = artifacts.require("GelatoDutchX");
const GELATO_DX = "0x98d9f9e8DEbd4A632682ba207670d2a5ACD3c489";
let gelatoDutchX;
// ********** Truffle/web3 setup END ********

// For testing
const assert = require("assert");

// Big Number stuff
const BN = web3.utils.BN;
const GDXSSAW_MAXGAS_BN = new BN("400000"); // 400.000 must be benchmarked

// State shared across the unit tests
// tx returned data
let txHash;
let txReceipt;

module.exports = () => {
  async function testListInterface() {
    // ********* get deployed instances ********
    // accounts
    accounts = await web3.eth.getAccounts();

    // get Gelato instances
    gelatoCore = await GelatoCore.deployed();
    gelatoDutchX = await GelatoDutchX.deployed();

    // Gelato
    assert.strictEqual(
      gelatoCore.address,
      GelatoCore.address,
      "gelatoCore address problem"
    );
    assert.strictEqual(
      gelatoDutchX.address,
      GelatoDutchX.address,
      "gelatoDutchX address problem"
    );
    // ********* get deployed instances END ********

    // ******** Default ownership tests ********
    gelatoCoreOwner = await gelatoCore.contract.methods.owner().call();
    gDXSSAWOwner = await gelatoDutchX.contract.methods.owner().call();

    assert.strictEqual(gelatoCoreOwner, accounts[0], "gelatoCoreOwner problem");
    assert.strictEqual(gDXSSAWOwner, accounts[0], "gDXSSAWOwner problem");
    // ******** Default ownership tests END ********

    // ******** list GELATO_DX interface on Gelato Core and set its maxGas ********
    await gelatoCore.contract.methods
      .listInterface(gelatoDutchX.address, GDXSSAW_MAXGAS_BN.toString())
      .send({ from: gelatoCoreOwner })
      .then(receipt => (txReceipt = receipt));

    const isWhitelisted = await gelatoCore.contract.methods
      .getInterfaceWhitelist(gelatoDutchX.address)
      .call();
    const maxGas = await gelatoCore.contract.methods
      .getInterfaceMaxGas(gelatoDutchX.address)
      .call(); // uint256

    assert.strictEqual(isWhitelisted, true, "gelatoDutchX whitelist problem");
    assert.strictEqual(
      maxGas,
      GDXSSAW_MAXGAS_BN.toString(),
      "gelatoDutchX maxGas problem"
    );
    // ******** list GELATO_DX interface on Gelato Core and set its maxGas END ********
    // ******** Event on core LogNewInterfaceListed ********
    assert.ok(
      txReceipt.events.LogNewInterfaceListed,
      "LogNewInterfaceListed event not ok"
    );
    assert.strictEqual(
      txReceipt.events.LogNewInterfaceListed.returnValues.dappInterface,
      gelatoDutchX.address,
      "LogNewInterfaceListed event dappInterface problem"
    );
    assert.strictEqual(
      txReceipt.events.LogNewInterfaceListed.returnValues.maxGas,
      GDXSSAW_MAXGAS_BN.toString(),
      "LogNewInterfaceListed event maxGas problem"
    );
    // ******** Event on core LogNewInterfaceListed END ********

    const dappInterface =
      txReceipt.events.LogNewInterfaceListed.returnValues.dappInterface;

    // Log the event
    console.log(
      "LogNewInterfaceListed Event Return Values:\n",
      txReceipt.events.LogNewInterfaceListed.returnValues
    );

    return `
        listInterface() Complete
        -------------------------
        gelatoCoreAddress:                  ${gelatoCore.address}
        dappInterfaceAddress(gelatoDutchX): ${dappInterface}
        maxGas:                             ${maxGas}
      `;
  }

  // run the test
  testListInterface().then(result => console.log(result));
};
