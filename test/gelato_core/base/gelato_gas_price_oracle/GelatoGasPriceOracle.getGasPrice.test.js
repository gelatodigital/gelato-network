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

  let oracle;
  let oracleAddress;

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

    [oracle] = await ethers.getSigners();
    oracleAddress = await oracle.getAddress();
  });

  it("Should NOT let anyone but GelatoCore read the oracle", async function () {
    // getGasPrice
    await expect(gelatoGasPriceOracle.getGasPrice()).to.be.revertedWith(
      "GelatoGasPriceOracle.onlyGelatoCore"
    );

    // setOracle
    await gelatoGasPriceOracle.setOracle(oracleAddress);

    // setGelatoGasPrice
    await gelatoGasPriceOracle
      .connect(oracle)
      .setGasPrice(initialState.gasPrice.add(42069));

    // getGasPrice
    await expect(
      gelatoGasPriceOracle.connect(oracle).getGasPrice()
    ).to.be.revertedWith("GelatoGasPriceOracle.onlyGelatoCore");
  });
});
