// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

import initialState from "./GelatoGasPriceOracle.initialState";

describe("GelatoCore - GelatoGasPriceOracle: getGasPrice", function () {
  // We define the ContractFactory and Signer variables here and assign them in
  // a beforeEach hook.
  let GelatoCoreFactory;
  let GelatoGasPriceOracleFactory;

  let gelatoCore;
  let gelatoGasPriceOracle;

  let oracleAdmin;
  let oracleAdminAddress;

  before(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCoreFactory = await ethers.getContractFactory("GelatoCore");
    GelatoGasPriceOracleFactory = await ethers.getContractFactory(
      "GelatoGasPriceOracle"
    );

    gelatoCore = await GelatoCoreFactory.deploy();
    gelatoGasPriceOracle = await GelatoGasPriceOracleFactory.deploy(
      gelatoCore.address,
      initialState.gasPrice
    );

    await gelatoCore.deployed();
    await gelatoGasPriceOracle.deployed();

    [oracleAdmin] = await ethers.getSigners();
    oracleAdminAddress = await oracleAdmin.getAddress();
  });

  it("Should NOT let anyone but GelatoCore read the oracle", async function () {
    // getGasPrice
    await expect(gelatoGasPriceOracle.getGasPrice()).to.be.revertedWith(
      "GelatoGasPriceOracle.onlyGelatoCore"
    );

    // setOracleAdmin
    await gelatoGasPriceOracle.setOracleAdmin(oracleAdminAddress);

    // setGelatoGasPrice
    await gelatoGasPriceOracle
      .connect(oracleAdmin)
      .setGasPrice(initialState.gasPrice.add(42069));

    // getGasPrice
    await expect(
      gelatoGasPriceOracle.connect(oracleAdmin).getGasPrice()
    ).to.be.revertedWith("GelatoGasPriceOracle.onlyGelatoCore");
  });
});
