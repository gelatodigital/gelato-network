// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

// GelatoSysAdmin creation time variable values
import initialState from "./GelatoSysAdmin.initialState";

describe("GelatoCore - GelatoSysAdmin - Setters: Gas related", function () {
  // We define the ContractFactory and Signer variables here and assign them in
  // a beforeEach hook.
  let GelatoCore;
  let gelatoCore;
  let owner;
  let notOwner;
  let oracle;
  let oracleAddress;

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCore = await ethers.getContractFactory("GelatoCore");
    gelatoCore = await GelatoCore.deploy();
    await gelatoCore.deployed();
    [owner, notOwner, oracle] = await ethers.getSigners();
    oracleAddress = await oracle.getAddress();
  });

  // We test different functionality of the contract as normal Mocha tests.
  describe("GelatoCore.GelatoSysAdmin.setGelatoGasPriceOracle", function () {
    it("Should let the owner setGelatoGasPriceOracle", async function () {
      // Every transaction and call is sent with the owner by default
      await expect(gelatoCore.setGelatoGasPriceOracle(oracleAddress))
        .to.emit(gelatoCore, "LogSetGelatoGasPriceOracle")
        .withArgs(initialState.gelatoGasPriceOracle, oracleAddress);

      expect(await gelatoCore.gelatoGasPriceOracle()).to.be.equal(
        oracleAddress
      );
    });

    it("Shouldn't let non-Owners setGelatoGasPriceOracle", async function () {
      // gelatoCore.connect returns the same GelatoCore contract instance,
      // but associated to a different signer
      await expect(
        gelatoCore.connect(notOwner).setGelatoGasPriceOracle(oracleAddress)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("GelatoCore.GelatoSysAdmin.setGelatoMaxGas", function () {
    it("Should let the owner setGelatoMaxGas", async function () {
      // Every transaction and call is sent with the owner by default
      await expect(gelatoCore.setGelatoMaxGas(100))
        .to.emit(gelatoCore, "LogSetGelatoMaxGas")
        .withArgs(initialState.gelatoMaxGas, 100);

      expect(await gelatoCore.gelatoMaxGas()).to.be.equal(100);
    });

    it("Shouldn't let non-Owners setGelatoMaxGas", async function () {
      // gelatoCore.connect returns the same GelatoCore contract instance,
      // but associated to a different signer
      await expect(
        gelatoCore.connect(notOwner).setGelatoMaxGas(100)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
